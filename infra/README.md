# Infra runbook

## Local cluster (OrbStack)

### First time setup
```bash
make k8s-build       # build 3 images with :dev tag
make k8s-secrets     # create K8s Secret from Keychain
make k8s-up          # apply manifests, wait for migrations and rollouts
```

### Daily commands
```bash
make k8s-status      # pods and services
make k8s-logs        # follow logs from all blurt pods
make k8s-down        # tear everything down
```

## Rebuild after code changes
```bash
make k8s-build
kubectl rollout restart deployment/api -n blurt
kubectl rollout restart deployment/worker -n blurt
kubectl rollout restart deployment/frontend -n blurt
kubectl rollout status deployment/api -n blurt
```

## Debug commands
```bash
# Describe a crashing pod
kubectl describe pod -n blurt <pod-name>

# Previous container logs (after crash)
kubectl logs -n blurt <pod-name> --previous

# Open a shell in a pod
kubectl exec -n blurt -it <pod-name> -- bash

# Connect to Postgres directly
kubectl exec -n blurt -it statefulset/postgres -- psql -U blurt

# Port-forward the API locally
kubectl port-forward -n blurt svc/api 8000:8000

# Watch pods in real time
kubectl get pods -n blurt -w
```

## Rollback
```bash
kubectl rollout undo deployment/api -n blurt
```

## Secrets
Secrets are never committed. Add to Keychain then run:
```bash
security add-generic-password -s blurt -a GROQ_API_KEY -w YOUR_KEY
make k8s-secrets
```
