#!/usr/bin/env bash
# Reads secrets from macOS Keychain and creates a Kubernetes Secret.
# Add each key first: security add-generic-password -s blurt -a KEY_NAME -w VALUE
set -euo pipefail

NAMESPACE=blurt

get_secret() {
  local key="$1"
  security find-generic-password -s blurt -a "$key" -w 2>/dev/null || {
    echo "⚠️  Missing Keychain entry for '$key'. Add with:" >&2
    echo "   security add-generic-password -s blurt -a $key -w YOUR_VALUE" >&2
    echo ""
  }
}

kubectl create secret generic blurt-secrets \
  --namespace="$NAMESPACE" \
  --from-literal=GROQ_API_KEY="$(get_secret GROQ_API_KEY)" \
  --from-literal=S3_ACCESS_KEY_ID="$(get_secret S3_ACCESS_KEY_ID)" \
  --from-literal=S3_SECRET_ACCESS_KEY="$(get_secret S3_SECRET_ACCESS_KEY)" \
  --from-literal=S3_ENDPOINT_URL="$(get_secret S3_ENDPOINT_URL)" \
  --from-literal=LLM_API_KEY="$(get_secret LLM_API_KEY)" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "✓ blurt-secrets applied to namespace $NAMESPACE"
