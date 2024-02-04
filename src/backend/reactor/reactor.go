package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
	"gitlab.com/greyxor/slogor"

	"nats_cqrs/shared"
)

//------------------------------------------------------------------------------

func main() {
	var (
		debug    = shared.GetEnv("DEBUG", "")
		logLevel = slog.LevelInfo
	)

	// Setup logging
	if debug == "true" {
		logLevel = slog.LevelDebug
	}
	logHandler := slogor.NewHandler(os.Stdout, &slogor.Options{Level: logLevel})
	logger := slog.New(logHandler)
	slog.SetDefault(logger)

	// Setup NATS
	nc, err := nats.Connect(nats.DefaultURL, nats.UserInfo("user", "password"))
	shared.AssertOk(err, logger, "Failed to connect to NATS server")

	js, err := jetstream.New(nc)
	shared.AssertOk(err, logger, "Failed to iniitalise JetStream client")

	err = shared.InitialiseStreams(js, logger)
	shared.AssertOk(err, logger, "Failed to setup NATS streams")

	// NATS KV (for repositories)
	kv, err := shared.InitialiseKv(js)
	shared.AssertOk(err, logger, "Failed to create KV bucket")

	// Dependencies
	locationsRepo := shared.NewNatsKvLocationsRepository(kv, logger.With("source", "locations-repo"))

	go func() {
		var (
			subject = fmt.Sprintf("%s.>", shared.StreamSubjectCommands)
			logger  = logger.With("source", "reactor", "subject", subject)
		)

		logger.Info("Starting reactor")

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		consumer, err := js.CreateOrUpdateConsumer(ctx, shared.StreamName, jetstream.ConsumerConfig{
			Name:          "reactor",
			Durable:       "reactor",
			AckPolicy:     jetstream.AckExplicitPolicy,
			FilterSubject: subject,
			DeliverPolicy: jetstream.DeliverAllPolicy,
		})
		shared.AssertOk(err, logger, "Failed to create consumer")

		projectToDb := func(msg jetstream.Msg) {
			meta, _ := msg.Metadata()
			logger := logger.With("seq", meta.Sequence.Stream)

			command := shared.CreateLocationCommand{}
			err := json.Unmarshal(msg.Data(), &command)
			if err != nil {
				logger.Error("Failed to decode message into CreateLocationCommand", "err", err)
				_ = msg.Nak()
				return
			}

			logger = logger.With("id", command.Id)

			location := shared.Location{
				Id:          command.Id,
				Name:        command.Name,
				Category:    command.Category,
				Description: command.Description,
				CreatedAt:   command.CreatedAt,
			}

			logger.Info("Projecting Location", "name", location.Name)
			err = locationsRepo.CreateLocation(context.Background(), location)
			if err != nil {
				logger.Error("Failed to store Location", "err", err)
				_ = msg.Nak()
				return
			}

			err = msg.Ack()
			if err != nil {
				logger.Error("Failed to ack message", "err", err)
			}

			err = sendNotification(
				nc,
				location.Id,
				*shared.NewNotification().
					WithAction(shared.Action{
						Type: "redirect",
						Data: fmt.Sprintf("/locations/%s", location.Id.String()),
					}).
					WithData("location", location),
			)
			if err != nil {
				logger.Error("Failed to send notification", "err", err)
				return
			}
			logger.Info("Sent notification")
		}

		ticker := time.NewTicker(1_000 * time.Millisecond)
		defer ticker.Stop()

		consumerCtx := context.Background()
		defer consumerCtx.Done()

	consumeLoop:
		for {
			batch, err := consumer.FetchNoWait(10)
			if err != nil {
				logger.Error("Error fetching batch", "err", err)
				break consumeLoop
			}

			logger.Debug(fmt.Sprintf("Got %v messages", len(batch.Messages())))
			for msg := range batch.Messages() {
				projectToDb(msg)
			}

			select {
			case <-ticker.C:
			case <-consumerCtx.Done():
				logger.Info("Consumer cancelled")
				break consumeLoop
			}
		}

		logger.Info("Consuming completed")
	}()

	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGTERM)
	<-done
}

func sendNotification(nc *nats.Conn, id uuid.UUID, notification shared.Notification) error {
	subject := fmt.Sprintf("%s.%s", shared.StreamSubjectNotifications, id.String())
	bytes, err := json.Marshal(notification)

	if err != nil {
		return err
	}
	return nc.Publish(subject, bytes)
}
