package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/render"
	"github.com/google/uuid"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
	"github.com/r3labs/sse/v2"
	slogchi "github.com/samber/slog-chi"
	"gitlab.com/greyxor/slogor"

	"nats_cqrs/shared"
)

//------------------------------------------------------------------------------

type LocationController struct {
	nc     *nats.Conn
	js     jetstream.JetStream
	repo   shared.LocationsRepository
	logger *slog.Logger
}

func NewLocationController(nc *nats.Conn, js jetstream.JetStream, repo shared.LocationsRepository, logger *slog.Logger) *LocationController {
	if logger == nil {
		logger = slog.Default()
	}
	return &LocationController{nc: nc, js: js, repo: repo, logger: logger}
}

func (c LocationController) GetLocationHandler(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		render.Status(r, http.StatusNotFound)
		render.PlainText(w, r, "not found")
		return
	}

	location, err := c.repo.GetLocation(context.Background(), id)
	if err != nil {
		render.Status(r, http.StatusInternalServerError)
		render.PlainText(w, r, err.Error())
		return
	}

	if location == nil {
		render.Status(r, http.StatusNotFound)
		return
	}

	render.JSON(w, r, location)
}

func (c LocationController) ListLocationHandler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	locations, err := c.repo.ListLocations(ctx)
	if err != nil {
		render.Status(r, http.StatusInternalServerError)
		render.PlainText(w, r, err.Error())
		return
	}

	render.JSON(w, r, locations)
}

type CreateLocationPayload struct {
	Name        string `json:"name"`
	Category    string `json:"category"`
	Description string `json:"description"`
}

func (p CreateLocationPayload) ToCommand(id uuid.UUID, createdAt time.Time) (*shared.CreateLocationCommand, error) {
	// TODO: Validation
	command := shared.CreateLocationCommand{
		Id:          id,
		Name:        p.Name,
		Category:    p.Category,
		Description: p.Description,
		CreatedAt:   createdAt,
	}

	return &command, nil
}

type CommandAcceptedResponse struct {
	Id           uuid.UUID            `json:"id"`
	Notification *shared.Notification `json:"notification"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

func (c LocationController) parseNotificationHeaders(r *http.Request) (bool, time.Duration, bool) {
	var (
		awaitHeader           = r.Header.Get(shared.NotificationAwaitHeader)
		awaitTimeoutHeader    = r.Header.Get(shared.NotificationTimeoutHeader)
		simulateTimeoutHeader = r.Header.Get(shared.NotificationSimulateTimeoutHeader)

		err               error = nil
		awaitNotification       = false
		awaitTimeout            = time.Duration(2 * time.Second)
		simulateTimeout         = false
	)

	if awaitHeader != "" {
		c.logger.Debug(
			fmt.Sprintf("Received %s header", shared.NotificationAwaitHeader),
			"value", awaitHeader,
		)

		awaitNotification, err = strconv.ParseBool(awaitHeader)
		if err != nil {
			c.logger.Warn(
				fmt.Sprintf("Could not parse header %s into boolean", shared.NotificationAwaitHeader),
				"value", awaitHeader,
			)
		}
	}

	if awaitTimeoutHeader != "" {
		c.logger.Debug(
			fmt.Sprintf("Received %s header", shared.NotificationTimeoutHeader),
			"value", awaitTimeoutHeader,
		)

		awaitTimeoutSecs, err := strconv.ParseInt(awaitTimeoutHeader, 0, 0)
		if err != nil {
			c.logger.Warn(
				fmt.Sprintf(
					"Could not parse header %s - Defaulting to %v",
					shared.NotificationTimeoutHeader,
					awaitTimeout,
				),
				"value", awaitTimeoutHeader,
			)
		} else {
			awaitTimeout = time.Duration(awaitTimeoutSecs * int64(time.Second))
		}
	}

	if simulateTimeoutHeader != "" {
		c.logger.Debug(
			fmt.Sprintf("Received %s header", shared.NotificationSimulateTimeoutHeader),
			"value", simulateTimeoutHeader,
		)

		simulateTimeout, err = strconv.ParseBool(simulateTimeoutHeader)
		if err != nil {
			c.logger.Warn(
				fmt.Sprintf(
					"Could not parse header %s - Defaulting to %v",
					shared.NotificationSimulateTimeoutHeader,
					simulateTimeout,
				),
				"value", simulateTimeoutHeader,
			)
		}
	}

	return awaitNotification, awaitTimeout, simulateTimeout
}

func (c LocationController) CreateLocationHandler(w http.ResponseWriter, r *http.Request) {
	var (
		payload = CreateLocationPayload{}
		id      = uuid.New()
		subject = fmt.Sprintf("%s.%s.CreateLocation", shared.StreamSubjectCommands, id)

		awaitNotification, awaitTimeout, awaitDelay = c.parseNotificationHeaders(r)
	)

	err := json.NewDecoder(r.Body).Decode(&payload)
	if err != nil {
		c.logger.Error("Failed to decode payload", "err", err)
		render.Status(r, http.StatusUnprocessableEntity)
		render.JSON(w, r, ErrorResponse{Error: err.Error()})
		return
	}

	command, err := payload.ToCommand(id, time.Now())
	if err != nil {
		c.logger.Error("Failed to validate payload", "err", err)
		render.Status(r, http.StatusUnprocessableEntity)
		render.JSON(w, r, ErrorResponse{Error: err.Error()})
		return
	}

	bytes, err := json.Marshal(command)
	if err != nil {
		c.logger.Error("Failed to serialise command", "err", err)
		render.Status(r, http.StatusInternalServerError)
		render.PlainText(w, r, err.Error())
		return
	}

	c.logger.Info(
		"Publishing command",
		"id", id,
		"command", "CreateLocation",
		"subject", subject,
	)

	publishCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	ack, err := c.js.Publish(publishCtx, subject, bytes)
	if err != nil {
		c.logger.Error("Failed to publish command", "err", err)
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, ErrorResponse{Error: err.Error()})
		return
	}
	c.logger.Debug("Got publish ack", "seq", ack.Sequence, "stream", ack.Stream)

	response := CommandAcceptedResponse{Id: id}

	if !awaitNotification {
		render.Status(r, http.StatusAccepted)
		render.JSON(w, r, response)
		return
	}

	c.awaitNotification(&response, awaitTimeout, awaitDelay)

	render.Status(r, http.StatusAccepted)
	render.JSON(w, r, response)
}

func (c *LocationController) awaitNotification(response *CommandAcceptedResponse, timeout time.Duration, simulateTimeout bool) {
	var (
		notificationsSubject       = fmt.Sprintf("%s.>", shared.StreamSubjectNotifications)
		err                  error = nil
		notificationsChan          = make(chan *nats.Msg)
	)
	c.logger.Info(
		"Awaiting notification",
		"timeout", timeout,
		"subject", notificationsSubject,
	)

	if !simulateTimeout {
		sub, err := c.nc.ChanSubscribe(notificationsSubject, notificationsChan)
		if err != nil {
			c.logger.Error("Failed to subscribe to notifications", "err", err)
		}
		defer sub.Unsubscribe()
	}

	select {
	case notificationMsg := <-notificationsChan:
		c.logger.Debug("Got notification")
		notification := &shared.Notification{}
		err = json.Unmarshal(notificationMsg.Data, notification)
		if err != nil {
			c.logger.Error("Failed to parse notification message into Notification")
			break
		}
		response.Notification = notification
	case <-time.After(timeout):
		c.logger.Error("Timed out waiting for notification", "timeout", timeout)
		break
	}
}

//------------------------------------------------------------------------------

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if len(value) == 0 {
		return defaultValue
	}
	return value
}

func main() {
	var (
		serveAddr = getEnv("SERVE_ADDR", ":3000")
		debug     = getEnv("DEBUG", "")

		logLevel = slog.LevelInfo
	)

	// Setup logging
	if debug == "true" {
		logLevel = slog.LevelDebug
	}
	logger := slog.New(slogor.NewHandler(os.Stdout, &slogor.Options{Level: logLevel}))
	slog.SetDefault(logger)

	// Setup NATS
	nc, err := nats.Connect(nats.DefaultURL, nats.UserInfo("user", "password"))
	shared.AssertOk(err, logger, "Failed to connect to NATS server")

	js, err := jetstream.New(nc)
	shared.AssertOk(err, logger, "Failed to initialise JetStream client")

	err = shared.InitialiseStreams(js, logger)
	shared.AssertOk(err, logger, "Failed to setup NATS streams")

	// NATS KV (for repositories)
	kv, err := shared.InitialiseKv(js)
	shared.AssertOk(err, logger, "Failed to create KV bucket")

	// SSE
	sseServer := sse.New()
	sseServer.AutoStream = true
	// It turns out, this is _really_ important...
	sseServer.Headers = map[string]string{"Content-Encoding": "none"}
	sseServer.OnSubscribe = func(streamId string, sub *sse.Subscriber) {
		logger.Info(
			"Subscriber connected",
			"stream", streamId,
			"url", sub.URL,
		)
	}
	sseServer.CreateStream(shared.StreamSubjectNotifications)

	// Dependencies
	locationsRepo := shared.NewNatsKvLocationsRepository(kv, logger.With("source", "locations-repo"))
	locationsController := NewLocationController(nc, js, locationsRepo, logger.With("source", "locations-controller"))

	// Initialise router
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(slogchi.NewWithConfig(logger.With("source", "router"), slogchi.Config{
		DefaultLevel:  slog.LevelDebug,
		WithRequestID: true,
	}))
	r.Use(middleware.Recoverer)

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		render.PlainText(w, r, "Ok")
	})
	r.Post("/location/create", locationsController.CreateLocationHandler)
	r.Get("/location/{id}", locationsController.GetLocationHandler)
	r.Get("/location", locationsController.ListLocationHandler)

	r.HandleFunc("/notifications", sseServer.ServeHTTP)

	// HTTP server
	go func() {
		logger.Info(fmt.Sprintf("Serving on %v", serveAddr))
		err = http.ListenAndServe(serveAddr, r)
		shared.AssertOk(err, logger, "Failed to start server")
	}()

	// Notifications bridge (SSE)
	notificationsCtx := context.Background()
	go func() {
		var (
			logger            = logger.With("source", "notification-bridge")
			subject           = fmt.Sprintf("%s.>", shared.StreamSubjectNotifications)
			notificationsChan = make(chan *nats.Msg)
		)
		logger.Info("Starting notification bridge", "subject", subject)

		sub, err := nc.ChanSubscribe(subject, notificationsChan)
		shared.AssertOk(err, logger, "Failed to subscribe to notifications")
		defer func() {
			err := sub.Unsubscribe()
			if err != nil {
				logger.Error("Failed to unsubscribe", "err", err)
			}
			close(notificationsChan)
		}()

		for {
			select {
			case <-notificationsCtx.Done():
				logger.Info("Notifications bridge context cancelled - stopping notification bridge")
				return

			case msg := <-notificationsChan:
				notification := shared.Notification{}
				err := json.Unmarshal(msg.Data, &notification)
				if err != nil {
					logger.Error("Failed to decode message into CreateLocationCommand", "err", err)
					_ = msg.Nak()
					continue
				}

				logger.Debug(
					"Sending SSE event notification",
					"stream", shared.StreamSubjectNotifications,
					"id", notification.Id.String(),
				)
				if !sseServer.StreamExists(shared.StreamSubjectNotifications) {
					logger.Error("Stream does not exist", "stream", shared.StreamSubjectNotifications)
				}
				sseServer.Publish(
					shared.StreamSubjectNotifications,
					&sse.Event{
						ID:    []byte(notification.Id.String()),
						Event: []byte("notification"),
						Data:  msg.Data,
					},
				)
				_ = msg.Ack()
			}
		}
	}()

	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGTERM)
	<-done
}
