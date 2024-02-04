package shared

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"slices"
	"time"

	"github.com/google/uuid"
	"github.com/nats-io/nats.go/jetstream"
)

//------------------------------------------------------------------------------

const (
	StreamName                        = "all"
	StreamSubjectNotifications        = "notifications"
	StreamSubjectCommands             = "commands"
	NotificationAwaitHeader           = "X-Notification-Await"
	NotificationTimeoutHeader         = "X-Notification-Timeout"
	NotificationSimulateTimeoutHeader = "X-Notification-Simulate-Timeout"
)

//------------------------------------------------------------------------------

func GetEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if len(value) == 0 {
		return defaultValue
	}
	return value
}

//------------------------------------------------------------------------------

type CreateLocationCommand struct {
	Id          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Category    string    `json:"category"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

//------------------------------------------------------------------------------

type Notification struct {
	Id      uuid.UUID      `json:"id"`
	Time    time.Time      `json:"created_at"`
	Errors  []string       `json:"errors"`
	Actions []Action       `json:"actions"`
	Data    map[string]any `json:"data"`
}

func (n *Notification) WithError(error string) *Notification {
	n.Errors = append(n.Errors, error)
	return n
}

func (n *Notification) WithAction(action Action) *Notification {
	n.Actions = append(n.Actions, action)
	return n
}

func (n *Notification) WithData(key string, value any) *Notification {
	n.Data[key] = value
	return n
}

func NewNotification() *Notification {
	return &Notification{
		Id:      uuid.New(),
		Time:    time.Now(),
		Errors:  []string{},
		Actions: []Action{},
		Data:    map[string]any{},
	}
}

type Action struct {
	Type string `json:"type"`
	Data any    `json:"data"`
}

//------------------------------------------------------------------------------

type Location struct {
	Id          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Category    string    `json:"category"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

func NewLocationFromCommand(command CreateLocationCommand) Location {
	return Location{
		Id:          command.Id,
		Name:        command.Name,
		Category:    command.Category,
		Description: command.Description,
		CreatedAt:   command.CreatedAt,
	}
}

type LocationsRepository interface {
	GetLocation(ctx context.Context, id uuid.UUID) (*Location, error)
	CreateLocation(ctx context.Context, location Location) error
	ListLocations(ctx context.Context) ([]Location, error)
}

// NatsKvLocationsRepository is a LocationsRepository built upon NATS KV
//
// ...You wouldn't do this in prod, but it's an excuse to (ab)use the KV
// API and reduce dependencies for this demo project!
type NatsKvLocationsRepository struct {
	kv     jetstream.KeyValue
	logger *slog.Logger
}

func NewNatsKvLocationsRepository(kv jetstream.KeyValue, logger *slog.Logger) *NatsKvLocationsRepository {
	if logger == nil {
		logger = slog.Default()
	}
	return &NatsKvLocationsRepository{kv: kv, logger: logger}
}

func (r *NatsKvLocationsRepository) CreateLocation(ctx context.Context, location Location) error {
	bytes, err := json.Marshal(location)
	if err != nil {
		return err
	}
	_, err = r.kv.Put(ctx, location.Id.String(), bytes)
	return err
}

func (r *NatsKvLocationsRepository) ListLocations(ctx context.Context) ([]Location, error) {
	var (
		keys      = []string{}
		locations = []Location{}
	)

	keyLister, err := r.kv.ListKeys(ctx)
	if err != nil {
		return locations, nil
	}

loopKeys:
	for {
		select {
		case key, ok := <-keyLister.Keys():
			if !ok {
				break loopKeys
			}
			keys = append(keys, key)

		case <-time.After(time.Second):
			return locations, fmt.Errorf("did not completed in time")
		}
	}

	r.logger.Debug(fmt.Sprintf("Got %v keys - Looking up values", len(keys)))

	for _, key := range keys {
		id, err := uuid.Parse(key)
		if err != nil {
			return locations, err
		}
		location, err := r.GetLocation(ctx, id)
		if err != nil {
			return locations, err
		}

		locations = append(locations, *location)
	}

	// Sort descending
	slices.SortFunc(locations, func(a, b Location) int {
		if a.CreatedAt.Before(b.CreatedAt) {
			return 1
		} else {
			return -1
		}
	})
	return locations, nil
}

func (r *NatsKvLocationsRepository) GetLocation(ctx context.Context, id uuid.UUID) (*Location, error) {
	kvEntry, err := r.kv.Get(ctx, id.String())
	if err != nil {
		r.logger.Error("Failed to retrieve all Locations")
		return nil, err
	}

	location := &Location{}
	err = json.Unmarshal(kvEntry.Value(), location)
	if err != nil {
		return nil, err
	}

	return location, nil
}

// Interface assertion
var _ LocationsRepository = (*NatsKvLocationsRepository)(nil)

//------------------------------------------------------------------------------

func AssertOk(err error, logger *slog.Logger, msg string) {
	if err != nil {
		logger.Error(msg, "err", err)
		os.Exit(0)
	}
}

func InitialiseKv(js jetstream.JetStream) (jetstream.KeyValue, error) {
	kvCtx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	kv, err := js.CreateKeyValue(kvCtx, jetstream.KeyValueConfig{
		Bucket:  "locations",
		History: 20,
	})
	return kv, err
}

func InitialiseStreams(js jetstream.JetStream, logger *slog.Logger) error {
	stream, err := js.CreateOrUpdateStream(
		context.Background(),
		jetstream.StreamConfig{
			Name: "all",
			Subjects: []string{
				fmt.Sprintf("%s.>", StreamSubjectCommands),
			},
		})
	if err != nil {
		return err
	}

	streamInfo, err := stream.Info(context.Background())
	if err != nil {
		return err
	}

	logger.Debug(
		fmt.Sprintf("Setup stream '%s'", streamInfo.Config.Name),
		"stream", streamInfo.Config.Name,
		"subjects", streamInfo.Config.Subjects,
	)
	return nil

}
