#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="sebastianeichh-dev"

echo "==> Deploying Beta Battle to OpenShift namespace: $NAMESPACE"
echo ""

# 1. PostgreSQL zuerst (andere Services brauchen die DB)
echo "[1/6] PostgreSQL..."
oc apply -f "$(dirname "$0")/postgresql.yaml"

echo "      Warte auf PostgreSQL..."
oc rollout status deployment/postgresql -n "$NAMESPACE" --timeout=120s

# 2. API
echo "[2/6] API..."
oc apply -f "$(dirname "$0")/api.yaml"

echo "      Warte auf API..."
oc rollout status deployment/api -n "$NAMESPACE" --timeout=180s

# 3-6. Frontend-Apps
for app in admin athlete register scoreboard; do
  echo "[$((${#app} > 0 ? 1 : 1))/6] $app..."
  oc apply -f "$(dirname "$0")/${app}.yaml"
done

oc rollout status deployment/admin      -n "$NAMESPACE" --timeout=60s
oc rollout status deployment/athlete    -n "$NAMESPACE" --timeout=60s
oc rollout status deployment/register   -n "$NAMESPACE" --timeout=60s
oc rollout status deployment/scoreboard -n "$NAMESPACE" --timeout=60s

echo ""
echo "==> Deployment abgeschlossen! URLs:"
echo ""
oc get routes -n "$NAMESPACE" --no-headers | awk '{print "   https://" $2}'
echo ""
