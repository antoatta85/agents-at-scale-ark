# TLS Configuration Guide

This guide explains how to enable and configure TLS for Ark services to address security findings L4 and L5 from the DataArt penetration testing report.

## Overview

The Ark platform has been hardened to support strong TLS configurations that:
- Enforce TLS 1.2 and TLS 1.3 only (disable TLS 1.0 and 1.1)
- Use strong cipher suites that provide forward secrecy
- Prefer server cipher ordering to ensure strongest ciphers are used

## Gateway API TLS Configuration

### Localhost Gateway (Development)

For local development, the `localhost-gateway` includes commented-out HTTPS listeners that can be enabled when certificates are configured.

To enable TLS for localhost development:

1. Create a self-signed certificate:
```bash
# Create a self-signed certificate for localhost
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout localhost-tls.key \
  -out localhost-tls.crt \
  -subj "/CN=127.0.0.1.nip.io"

# Create a Kubernetes secret
kubectl create secret tls localhost-gateway-tls \
  --cert=localhost-tls.crt \
  --key=localhost-tls.key \
  -n ark-system
```

2. Uncomment the HTTPS listeners in the Gateway configuration:
   - Edit `services/localhost-gateway/chart/templates/gateway.yaml`
   - Uncomment the `https-wildcard` and `https-root` listeners

3. Redeploy the gateway:
```bash
helm upgrade --install localhost-gateway services/localhost-gateway/chart \
  -n ark-system
```

### Production Gateway

For production deployments, create a Gateway with TLS listeners using certificates from cert-manager or your certificate provider:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: production-gateway
  namespace: ark-system
spec:
  gatewayClassName: nginx
  listeners:
  - name: https
    port: 443
    protocol: HTTPS
    hostname: "*.example.com"
    tls:
      mode: Terminate
      certificateRefs:
        - name: wildcard-tls-cert
      options:
        # Enforce TLS 1.2 and 1.3 only
        nginx.org/ssl-protocols: "TLSv1.2 TLSv1.3"
        # Strong cipher suites with forward secrecy
        nginx.org/ssl-ciphers: "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384"
        # Prefer server cipher ordering
        nginx.org/ssl-prefer-server-ciphers: "on"
    allowedRoutes:
      namespaces:
        from: All
```

## Ingress TLS Configuration

If using traditional Kubernetes Ingress (instead of Gateway API), configure TLS in your Ingress values:

```yaml
ingress:
  enabled: true
  className: nginx
  annotations:
    # TLS protocol and cipher configuration
    nginx.ingress.kubernetes.io/ssl-protocols: "TLSv1.2 TLSv1.3"
    nginx.ingress.kubernetes.io/ssl-ciphers: "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384"
    nginx.ingress.kubernetes.io/ssl-prefer-server-ciphers: "on"
    # Security headers (already configured)
    nginx.ingress.kubernetes.io/configuration-snippet: |
      more_set_headers "X-Frame-Options: DENY";
      more_set_headers "Content-Security-Policy: frame-ancestors 'none'";
      more_set_headers "X-Content-Type-Options: nosniff";
      more_set_headers "X-XSS-Protection: 1; mode=block";
      more_set_headers "Strict-Transport-Security: max-age=31536000; includeSubDomains";
      more_set_headers "Referrer-Policy: strict-origin-when-cross-origin";
  hosts:
    - host: ark-api.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: ark-api-tls
      hosts:
        - ark-api.example.com
```

## Cipher Suite Explanation

The configured cipher suites provide:

### TLS 1.3 Ciphers (automatically included)
- `TLS_AES_128_GCM_SHA256`
- `TLS_AES_256_GCM_SHA384`
- `TLS_CHACHA20_POLY1305_SHA256`

### TLS 1.2 Ciphers (explicitly configured)
- **ECDHE-ECDSA-AES128-GCM-SHA256**: Elliptic curve ephemeral key exchange with AES-128-GCM
- **ECDHE-RSA-AES128-GCM-SHA256**: RSA with ephemeral elliptic curve and AES-128-GCM
- **ECDHE-ECDSA-AES256-GCM-SHA384**: Elliptic curve ephemeral key exchange with AES-256-GCM
- **ECDHE-RSA-AES256-GCM-SHA384**: RSA with ephemeral elliptic curve and AES-256-GCM
- **ECDHE-ECDSA-CHACHA20-POLY1305**: ChaCha20-Poly1305 for mobile devices
- **ECDHE-RSA-CHACHA20-POLY1305**: ChaCha20-Poly1305 with RSA
- **DHE-RSA-AES128-GCM-SHA256**: Diffie-Hellman ephemeral with AES-128-GCM
- **DHE-RSA-AES256-GCM-SHA384**: Diffie-Hellman ephemeral with AES-256-GCM

All ciphers provide:
- **Forward Secrecy**: Ephemeral key exchange (ECDHE or DHE)
- **Authenticated Encryption**: GCM or Poly1305 modes
- **No Weak Algorithms**: No RC4, MD5, DES, or 3DES

## Certificate Management

### Using cert-manager

For production deployments, use cert-manager to automate certificate management:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: ark-api-cert
  namespace: ark-system
spec:
  secretName: ark-api-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - ark-api.example.com
    - "*.ark.example.com"
```

### Using External Certificates

If you have certificates from an external CA:

```bash
# Create secret from certificate files
kubectl create secret tls ark-api-tls \
  --cert=cert.pem \
  --key=key.pem \
  -n ark-system
```

## Verification

### Test TLS Configuration

```bash
# Test TLS version support
openssl s_client -connect ark-api.example.com:443 -tls1_2
openssl s_client -connect ark-api.example.com:443 -tls1_3

# Test that TLS 1.0 and 1.1 are disabled
openssl s_client -connect ark-api.example.com:443 -tls1
openssl s_client -connect ark-api.example.com:443 -tls1_1

# Check cipher suites
nmap --script ssl-enum-ciphers -p 443 ark-api.example.com
```

### Security Headers Verification

```bash
# Check security headers
curl -I https://ark-api.example.com

# Should include:
# X-Frame-Options: DENY
# Content-Security-Policy: frame-ancestors 'none'
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
# Strict-Transport-Security: max-age=31536000; includeSubDomains
# Referrer-Policy: strict-origin-when-cross-origin
```

## Troubleshooting

### Certificate Issues

If you encounter certificate errors:

1. Verify the certificate is in the correct namespace:
```bash
kubectl get secret -n ark-system
```

2. Check certificate validity:
```bash
kubectl get certificate -n ark-system
```

3. View certificate details:
```bash
kubectl describe certificate ark-api-cert -n ark-system
```

### TLS Handshake Failures

If clients cannot connect:

1. Check nginx-gateway-fabric logs:
```bash
kubectl logs -n ark-system -l app.kubernetes.io/name=nginx-gateway-fabric
```

2. Verify cipher suite compatibility with your clients
3. Consider adding compatibility ciphers if needed (with security review)

## References

- [OWASP TLS Cipher String Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/TLS_Cipher_String_Cheat_Sheet.html)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [Gateway API TLS Documentation](https://gateway-api.sigs.k8s.io/guides/tls/)
- [cert-manager Documentation](https://cert-manager.io/docs/)
