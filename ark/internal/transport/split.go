package transport

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"k8s.io/client-go/rest"
)

type SplitTransport struct {
	defaultTransport http.RoundTripper
	arkTransport     http.RoundTripper
	arkHost          string
}

func NewSplitTransport(defaultConfig *rest.Config, arkURL string) (*SplitTransport, error) {
	defaultTransport, err := rest.TransportFor(defaultConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create default transport: %w", err)
	}

	parsedURL, err := url.Parse(arkURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse ark-apiserver URL: %w", err)
	}

	arkConfig := &rest.Config{
		Host: arkURL,
		TLSClientConfig: rest.TLSClientConfig{
			Insecure: true,
		},
	}
	arkTransport, err := rest.TransportFor(arkConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create ark transport: %w", err)
	}

	return &SplitTransport{
		defaultTransport: defaultTransport,
		arkTransport:     arkTransport,
		arkHost:          parsedURL.Host,
	}, nil
}

func (t *SplitTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	if strings.HasPrefix(req.URL.Path, "/apis/ark.mckinsey.com/") {
		arkReq := req.Clone(req.Context())
		arkReq.URL.Scheme = "https"
		arkReq.URL.Host = t.arkHost
		arkReq.Host = t.arkHost
		return t.arkTransport.RoundTrip(arkReq)
	}
	return t.defaultTransport.RoundTrip(req)
}
