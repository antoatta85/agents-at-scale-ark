package operations

type OperationData struct {
	QueryID        string
	QueryName      string
	QueryNamespace string
	SessionID      string
	TargetType     string
	TargetName     string
	ErrorMessage   string
	Metadata       map[string]string
}
