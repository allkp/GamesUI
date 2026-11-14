# Local DevOps bootcamp: Spring Boot + React + TypeScript

This is a practical 10-hour plan for Ubuntu 24.04 LTS and a GitHub-hosted application. No source repository was present in this workspace, so examples assume `backend/` (Maven, Java 21) and `frontend/` (Vite, npm). Adjust paths, versions, tests, ports, and API routes to your repo. Recommended laptop: 4 CPU, 8 GB RAM minimum, 25 GB free disk. A laptop Kubernetes cluster is a production-style learning environment, not an HA production platform.

## Architecture and limits

GitHub Actions runs tests and builds/scans/pushes immutable-tagged images to GHCR. You pull/build images locally and deploy to Kind. GitHub-hosted runners cannot reach a laptop cluster without an intentionally configured secure network path, so this plan does not pretend a cloud-style remote deployment happens automatically. You will practice local rollout and rollback; the cloud mapping shows the next step.

## Hour 1–2 — Ubuntu, Git, Docker, Kubernetes, GitHub

Use Ubuntu native/VM for the closest server experience; on Windows, WSL2 Ubuntu is suitable for this exercise. Allocate 4 CPUs and 8 GB RAM and enable systemd where needed. Start:

```bash
cat /etc/os-release
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg git jq make unzip tree
mkdir -p ~/src && cd ~/src
```

Practice `pwd`, `ls -la`, `cd`, `mkdir`, `cp`, `mv`, `rm -i`, `cat`, `less`, `tail -f`, `rg`, `find`, `chmod`, `ps`, `top`, `df -h`, `free -h`, `ss -lntp`, `systemctl status`, `journalctl -u`, `curl -i`, `env`, and `man`. Avoid running unreviewed remote scripts as root.

Install Docker Engine from the official apt repository:

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo docker run --rm hello-world
docker compose version
```

Optionally run `sudo usermod -aG docker "$USER"`, then log out/in. Docker group membership is root-equivalent; use only for trusted accounts.

Install kubectl (stable channel; use the official docs if the URL changes):

```bash
sudo apt-get update && sudo apt-get install -y ca-certificates curl
K8S_VERSION="$(curl -L -s https://dl.k8s.io/release/stable.txt)"
curl -LO "https://dl.k8s.io/release/${K8S_VERSION}/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
rm kubectl
kubectl version --client
```

Install Kind using its official release instructions. Example x86_64 version (check the current release/checksum first):

```bash
KIND_VERSION=v0.30.0
curl -Lo ./kind "https://kind.sigs.k8s.io/dl/${KIND_VERSION}/kind-linux-amd64"
chmod +x ./kind && sudo mv ./kind /usr/local/bin/kind
kind version
```

`kind-config.yaml`:

```yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: bootcamp
nodes:
  - role: control-plane
    extraPortMappings:
      - { containerPort: 30080, hostPort: 8080, protocol: TCP }
  - role: worker
```

```bash
kind create cluster --config kind-config.yaml
kubectl cluster-info --context kind-bootcamp
kubectl get nodes -o wide
```

Minikube alternative: install from official docs, then `minikube start --driver=docker --cpus=4 --memory=6g`. Use one cluster tool today.

Clone your existing repository and inspect it:

```bash
git clone https://github.com/OWNER/REPOSITORY.git
cd REPOSITORY
git status --short
find . -maxdepth 3 -type f | sort | head -200
```

If starting a new repo, create an empty GitHub repo, then `git init -b main`, add `.gitignore`, `git add .`, `git commit -m "Initial application"`, `git remote add origin https://github.com/OWNER/REPOSITORY.git`, `git push -u origin main`. Use `gh auth login` or browser authentication; never embed tokens in URLs.

Checkpoint: hello-world runs, Kind node is Ready, repo is clean/understood.

## Hour 3–4 — Multi-stage Dockerfiles

Recommended placement (adapt to actual monorepo):

```text
repository/
├── backend/Dockerfile, backend/.dockerignore
├── frontend/Dockerfile, frontend/.dockerignore, frontend/nginx.conf
├── deploy/k8s/
├── monitoring/
├── .github/workflows/ci.yml
└── compose.yaml
```

`backend/Dockerfile` (Maven wrapper and Java 21; Gradle apps use `./gradlew bootJar` and `build/libs/`):

```dockerfile
# syntax=docker/dockerfile:1
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline
COPY src/ src/
RUN ./mvnw -B -DskipTests package
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
RUN groupadd --system spring && useradd --system --gid spring --home-dir /app spring
COPY --from=build --chown=spring:spring /workspace/target/*.jar /app/app.jar
USER spring:spring
EXPOSE 8080
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
```

`backend/.dockerignore`:

```text
.git
.idea
.vscode
target
build
*.iml
.env*
```

`frontend/Dockerfile` (Vite output is `dist`; CRA commonly outputs `build`):

```dockerfile
# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
USER nginx
CMD ["nginx", "-g", "daemon off;"]
```

`frontend/nginx.conf`:

```nginx
server {
  listen 8080;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;
  location /api/ {
    proxy_pass http://backend:8080/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
  location / { try_files $uri $uri/ /index.html; }
  location = /healthz { access_log off; add_header Content-Type text/plain; return 200 'ok'; }
}
```

`frontend/.dockerignore`:

```text
node_modules
dist
build
.git
.env*
npm-debug.log*
```

Multi-stage builds keep compilers out of runtime images. Non-root, `.dockerignore`, no credentials in build args/layers, small runtime base, and patched base images reduce risk. Pin base images to digests for tightly controlled production releases. Confirm the chosen Nginx image runs non-root with writable temp paths; Kubernetes config below mounts temp dirs. Build: `docker build -t demo-backend:dev ./backend` and likewise frontend. If paths differ, set build context correctly.

## Hour 5–6 — Compose and GitHub Actions

`compose.yaml` (dev integration; add DB and volume if your backend needs one):

```yaml
services:
  backend:
    build: ./backend
    environment:
      SPRING_PROFILES_ACTIVE: docker
      SERVER_PORT: "8080"
      MANAGEMENT_ENDPOINTS_WEB_EXPOSURE_INCLUDE: health,info,prometheus
      MANAGEMENT_ENDPOINT_HEALTH_PROBES_ENABLED: "true"
    expose: ["8080"]
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://127.0.0.1:8080/actuator/health/readiness | grep -q UP"]
      interval: 15s
      timeout: 3s
      retries: 5
      start_period: 40s
    networks: [app]
    restart: unless-stopped
  frontend:
    build: ./frontend
    ports: ["8080:8080"]
    depends_on:
      backend: { condition: service_healthy }
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:8080/healthz"]
      interval: 15s
      timeout: 3s
      retries: 3
    networks: [app]
    restart: unless-stopped
networks:
  app: { driver: bridge }
```

Use `.env` for local values and add it to `.gitignore`; never commit secrets. Start/inspect with `docker compose up --build -d`, `docker compose ps`, `docker compose logs -f`, `curl -i localhost:8080`; stop with `docker compose down` (avoid `-v` unless intentionally deleting data). Browser API requests use `/api`, while Nginx resolves `backend` on the internal network.

Add dependencies to Spring Boot Maven project:

```xml
<dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-actuator</artifactId></dependency>
<dependency><groupId>io.micrometer</groupId><artifactId>micrometer-registry-prometheus</artifactId></dependency>
```

`backend/src/main/resources/application-docker.yml`:

```yaml
management:
  endpoints.web.exposure.include: health,info,prometheus
  endpoint.health:
    probes.enabled: true
    show-details: never
  metrics.tags.application: ${spring.application.name:backend}
```

Never expose actuator env/config/shutdown endpoints publicly. Restrict management access in real environments.

Create `.github/workflows/ci.yml`. Set repository variables `GHCR_OWNER` (lowercase account/org) and `IMAGE_PREFIX` (lowercase app name). The workflow requires backend Maven wrapper and frontend package lock; replace commands for Gradle/pnpm/yarn and actual test tools. Review third-party actions and pin to verified full commit SHAs for production.

```yaml
name: CI and publish images
on:
  pull_request:
  push:
    branches: [main]
    tags: ['v*']
permissions:
  contents: read
  packages: write
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: '21', cache: maven }
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: npm, cache-dependency-path: frontend/package-lock.json }
      - run: ./mvnw -B verify
        working-directory: backend
      - run: npm ci && npm run lint --if-present && npm test -- --run && npm run build
        working-directory: frontend
  publish:
    if: github.event_name == 'push'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/metadata-action@v5
        id: backmeta
        with:
          images: ghcr.io/${{ vars.GHCR_OWNER }}/${{ vars.IMAGE_PREFIX }}-backend
          tags: |
            type=sha
            type=ref,event=branch
            type=semver,pattern={{version}}
      - uses: docker/build-push-action@v6
        with:
          context: ./backend
          push: true
          tags: ${{ steps.backmeta.outputs.tags }}
          labels: ${{ steps.backmeta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
      - uses: docker/metadata-action@v5
        id: frontmeta
        with:
          images: ghcr.io/${{ vars.GHCR_OWNER }}/${{ vars.IMAGE_PREFIX }}-frontend
          tags: |
            type=sha
            type=ref,event=branch
            type=semver,pattern={{version}}
      - uses: docker/build-push-action@v6
        with:
          context: ./frontend
          push: true
          tags: ${{ steps.frontmeta.outputs.tags }}
          labels: ${{ steps.frontmeta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
      - uses: aquasecurity/trivy-action@master
        with:
          image-ref: ghcr.io/${{ vars.GHCR_OWNER }}/${{ vars.IMAGE_PREFIX }}-backend:sha-${{ github.sha }}
          format: table
          exit-code: '1'
          ignore-unfixed: true
          vuln-type: os,library
          severity: CRITICAL,HIGH
```

Check that your test runner accepts `npm test -- --run`; do not represent an absent test suite as successful coverage. The workflow publishes branch/tag images only after tests pass. `GITHUB_TOKEN` avoids a long-lived registry token. A real deployment pipeline should use protected environments, image digests, approvals, and (for cloud) OIDC. This job publishes but does not access the laptop cluster.

Checkpoint: PR checks pass, merge to main, confirm both packages in GHCR. Use SHA/digest tags, not `latest`, for deployment.

## Hour 7–8 — Kubernetes deployment, probes, rollbacks, HPA

For local Kind, build and load images:

```bash
docker build -t demo-backend:dev ./backend
docker build -t demo-frontend:dev ./frontend
kind load docker-image demo-backend:dev --name bootcamp
kind load docker-image demo-frontend:dev --name bootcamp
```

Create `deploy/k8s/app.yaml` (backend runs UID 10001, frontend Nginx UID 101; validate image ownership/paths):

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: bootcamp
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
---
apiVersion: v1
kind: ConfigMap
metadata: { name: backend-config, namespace: bootcamp }
data:
  SPRING_PROFILES_ACTIVE: k8s
  SERVER_PORT: "8080"
  MANAGEMENT_ENDPOINTS_WEB_EXPOSURE_INCLUDE: health,info,prometheus
  MANAGEMENT_ENDPOINT_HEALTH_PROBES_ENABLED: "true"
---
apiVersion: apps/v1
kind: Deployment
metadata: { name: backend, namespace: bootcamp }
spec:
  replicas: 2
  revisionHistoryLimit: 3
  strategy:
    type: RollingUpdate
    rollingUpdate: { maxUnavailable: 0, maxSurge: 1 }
  selector: { matchLabels: { app: backend } }
  template:
    metadata: { labels: { app: backend } }
    spec:
      automountServiceAccountToken: false
      securityContext:
        runAsNonRoot: true
        runAsUser: 10001
        runAsGroup: 10001
        seccompProfile: { type: RuntimeDefault }
      containers:
        - name: backend
          image: demo-backend:dev
          imagePullPolicy: IfNotPresent
          ports: [{ name: http, containerPort: 8080 }]
          envFrom: [{ configMapRef: { name: backend-config } }]
          startupProbe:
            httpGet: { path: /actuator/health/liveness, port: http }
            periodSeconds: 5
            failureThreshold: 30
          livenessProbe:
            httpGet: { path: /actuator/health/liveness, port: http }
            periodSeconds: 10
          readinessProbe:
            httpGet: { path: /actuator/health/readiness, port: http }
            periodSeconds: 5
          resources:
            requests: { cpu: 250m, memory: 384Mi }
            limits: { cpu: "1", memory: 768Mi }
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities: { drop: ["ALL"] }
          volumeMounts: [{ name: tmp, mountPath: /tmp }]
      volumes: [{ name: tmp, emptyDir: { sizeLimit: 64Mi } }]
---
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: bootcamp
  labels: { app: backend }
spec:
  type: ClusterIP
  selector: { app: backend }
  ports: [{ name: http, port: 8080, targetPort: http }]
---
apiVersion: apps/v1
kind: Deployment
metadata: { name: frontend, namespace: bootcamp }
spec:
  replicas: 2
  revisionHistoryLimit: 3
  strategy:
    type: RollingUpdate
    rollingUpdate: { maxUnavailable: 0, maxSurge: 1 }
  selector: { matchLabels: { app: frontend } }
  template:
    metadata: { labels: { app: frontend } }
    spec:
      automountServiceAccountToken: false
      securityContext:
        runAsNonRoot: true
        runAsUser: 101
        runAsGroup: 101
        seccompProfile: { type: RuntimeDefault }
      containers:
        - name: frontend
          image: demo-frontend:dev
          imagePullPolicy: IfNotPresent
          ports: [{ name: http, containerPort: 8080 }]
          startupProbe:
            httpGet: { path: /healthz, port: http }
            periodSeconds: 5
            failureThreshold: 12
          readinessProbe:
            httpGet: { path: /healthz, port: http }
            periodSeconds: 5
          livenessProbe:
            httpGet: { path: /healthz, port: http }
            periodSeconds: 10
          resources:
            requests: { cpu: 50m, memory: 64Mi }
            limits: { cpu: 250m, memory: 128Mi }
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities: { drop: ["ALL"] }
          volumeMounts:
            - { name: cache, mountPath: /var/cache/nginx }
            - { name: run, mountPath: /var/run }
            - { name: tmp, mountPath: /tmp }
      volumes:
        - { name: cache, emptyDir: { sizeLimit: 32Mi } }
        - { name: run, emptyDir: { sizeLimit: 8Mi } }
        - { name: tmp, emptyDir: { sizeLimit: 16Mi } }
---
apiVersion: v1
kind: Service
metadata: { name: frontend, namespace: bootcamp }
spec:
  type: NodePort
  selector: { app: frontend }
  ports: [{ name: http, port: 80, targetPort: http, nodePort: 30080 }]
```

ConfigMaps hold non-secret config. Secret values are base64, not encrypted by encoding. Create a local-only secret without committing it: `kubectl -n bootcamp create secret generic backend-secrets --from-literal=SPRING_DATASOURCE_PASSWORD='local-only-value'`; add `envFrom: [{secretRef: {name: backend-secrets}}]` to backend only if needed. Never place real values in Git/YAML. In production use a secret manager, RBAC, encryption at rest, and rotation. No database/PVC is invented here because persistence needs are unknown; if required locally, create a PVC using the cluster storage class, while production data is usually better on managed storage/database with backup/restore drills.

Deploy and inspect:

```bash
kubectl apply -f deploy/k8s/app.yaml
kubectl -n bootcamp rollout status deployment/backend
kubectl -n bootcamp rollout status deployment/frontend
kubectl -n bootcamp get all
curl -i http://localhost:8080/healthz
```

Change image and rollback:

```bash
kubectl -n bootcamp set image deployment/backend backend=demo-backend:dev
kubectl -n bootcamp rollout history deployment/backend
kubectl -n bootcamp rollout undo deployment/backend
```

For GHCR deployment replace image by `ghcr.io/owner/app-backend:sha-COMMIT`; private packages need `imagePullSecret`. Prefer immutable digests in release automation. The NodePort mapping is the simple local endpoint; Ingress is optional. To learn Ingress, install ingress-nginx via its official Kind-specific instructions and define host routing to frontend; controller/load balancer behavior differs per cluster. Production needs DNS, TLS, maintained controller/Gateway, and policy.

HPA requires Metrics Server and resource requests. Install Metrics Server according to its official docs; Kind may require its documented kubelet TLS setting. `deploy/k8s/backend-hpa.yaml`:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: backend, namespace: bootcamp }
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: backend }
  minReplicas: 2
  maxReplicas: 5
  metrics:
    - type: Resource
      resource:
        name: cpu
        target: { type: Utilization, averageUtilization: 70 }
```

`kubectl apply -f deploy/k8s/backend-hpa.yaml`, then `kubectl top pods -n bootcamp`, `kubectl get hpa -n bootcamp`. HPA is not capacity: the cluster needs spare schedulable resources and a representative workload.

## Hour 9–10 — Metrics, logs, security, cloud architecture, interview

Install Helm from its official guide, then kube-prometheus-stack:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
kubectl create namespace monitoring
helm upgrade --install observability prometheus-community/kube-prometheus-stack \
  --namespace monitoring --set grafana.adminPassword='local-dev-only-change-me' \
  --set prometheus.prometheusSpec.podMonitorSelectorNilUsesHelmValues=false
```

Create `monitoring/backend-servicemonitor.yaml` (Service must have label `app: backend` and named port `http`, as above):

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: backend
  namespace: monitoring
  labels: { release: observability }
spec:
  namespaceSelector: { matchNames: [bootcamp] }
  selector: { matchLabels: { app: backend } }
  endpoints:
    - { port: http, path: /actuator/prometheus, interval: 30s }
```

`kubectl apply -f monitoring/backend-servicemonitor.yaml`. Grafana: `kubectl -n monitoring port-forward svc/observability-grafana 3000:80`, browse localhost:3000, login admin and chosen password. Prometheus: port-forward its chart service to 9090 and inspect Targets. Change local password; do not use this setup for shared production. Metrics differ from logs: inspect app logs via `kubectl logs`; production commonly ships stdout/stderr with Fluent Bit/OpenTelemetry to Loki, Elasticsearch/OpenSearch, or a cloud log service. Avoid logging credentials/PII; define retention and alerts.

Security: install Trivy by its official guide and scan:

```bash
trivy fs --scanners vuln,secret,misconfig .
trivy image --severity HIGH,CRITICAL demo-backend:dev
trivy image --severity HIGH,CRITICAL demo-frontend:dev
```

Remediate findings, or record narrow exceptions with owners/expiry and rescan after base updates. Add Dependabot/Renovate, CodeQL/SAST, dependency review, SBOM, image signing/provenance, protected branches, secret scanning, and least-privilege CI. Kubernetes NetworkPolicy needs a supporting CNI. Pod Security Admission, non-root, read-only filesystem, dropped capabilities, RBAC, and admission policy are layered controls.

### Local-to-cloud mapping

| Local | AWS | Azure | Google Cloud |
|---|---|---|---|
| Kind control plane/nodes | EKS + managed node groups/Fargate | AKS + node pools | GKE regional/zonal + node pools |
| Local image | ECR | Azure Container Registry | Artifact Registry |
| Ingress/load balancing | AWS Load Balancer Controller, ALB/NLB | Azure Load Balancer / Application Gateway for Containers | GKE Ingress/Gateway |
| Secrets | Secrets Manager + CSI/External Secrets + KMS | Key Vault + CSI + managed identity | Secret Manager + CSI + Cloud KMS |
| Volumes | EBS CSI/EFS | Azure Disk/Files CSI | Persistent Disk/Filestore CSI |
| Logs/metrics | CloudWatch, AMP/Grafana | Azure Monitor, Managed Prometheus/Grafana | Cloud Logging/Monitoring, Managed Prometheus |
| GitHub identity | OIDC federation to IAM role | OIDC federation to Entra | Workload Identity Federation |

Cloud additionally requires VPC/VNet, private networking, IAM, DNS/TLS, budgets, backups, managed database, audit, upgrades, disaster recovery, and Terraform/IaC. Do not create cloud resources for this local bootcamp.

### Troubleshooting drills

| Symptom | Inspect | Likely issue |
|---|---|---|
| ImagePullBackOff | `kubectl describe pod -n bootcamp POD` | Wrong tag, private registry auth, image not `kind load`ed |
| CrashLoopBackOff | `kubectl logs -n bootcamp POD --previous` | App config/dependency/runtime failure |
| Probe fails | port-forward pod, curl health path | Wrong path/port, Actuator absent, slow startup |
| Service has no endpoints | `kubectl get endpoints,pods -n bootcamp --show-labels` | Selector mismatch or Pods not Ready |
| OOMKilled | `kubectl describe pod`, `kubectl top pod` | Memory limit too low/leak; inspect JVM/container sizing |
| NodePort unreachable | `kubectl get svc`, `docker ps`, curl localhost:8080 | Kind mapping missing/wrong port |
| HPA unknown | `kubectl get apiservices`, `kubectl top nodes` | Metrics server or resource requests missing |
| No Prometheus target | `kubectl get servicemonitor -A` | ServiceMonitor labels, namespace, service port mismatch |

Useful general commands: `kubectl get events -A --sort-by=.lastTimestamp`, `kubectl describe`, `kubectl logs -f`, `kubectl exec`, `docker compose logs -f`, `docker inspect`, `docker history`.

### Interview questions to answer aloud

- DevOps: How make releases reproducible? Explain tests, immutable artifact, declarative config, approvals, rollback. How manage cloud credentials? Short-lived OIDC federation, scoped roles, no static keys. How recover from region loss? State backups, IaC, keys/secrets, DNS, tested RTO/RPO.
- Kubernetes: Deployment vs Pod? Readiness vs liveness vs startup? Why requests/limits? How does Service route to Pods? What does HPA need? Why can a rolling update stall?
- Docker: Image vs container? Why multi-stage? Why non-root? What does `.dockerignore` protect? Why is Docker socket access sensitive?
- CI/CD: Why test before publishing? Why immutable image tags? What is a protected environment? Why use SBOM/provenance?
- Exercise: break readiness path, diagnose events/logs, fix it; deploy an image, watch rollout, rollback; explain what must change before public launch.

## Cleanup and checklist

```bash
kubectl delete namespace bootcamp monitoring
kind delete cluster --name bootcamp
docker compose down
```

Before calling it complete: app/tests build; Compose works; CI tests PRs and publishes images; local pods are Ready and reachable; rollbacks work; metrics scrape; Trivy scans; no secrets committed; images run non-root; probes/resources/config are present. Commit files in small changes. Ten hours is realistic if the app already builds and has tests; debugging an unknown DB, native dependency, virtualization or test runner can consume the day. Prioritize working app → Compose → Kubernetes → CI publish → monitoring → hardening.

## Official references

- [Docker Engine Ubuntu install](https://docs.docker.com/engine/install/ubuntu/)
- [Kind Quick Start](https://kind.sigs.k8s.io/docs/user/quick-start/)
- [kubectl Linux install](https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/)
- [Minikube start](https://minikube.sigs.k8s.io/docs/start/)
- [Docker GitHub Actions](https://docs.docker.com/build/ci/github-actions/)
- [Spring Boot Actuator](https://docs.spring.io/spring-boot/reference/actuator/)
- [Kubernetes probes](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/)
- [Kubernetes HPA](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Prometheus community Helm charts](https://github.com/prometheus-community/helm-charts)
- [Trivy installation](https://trivy.dev/latest/getting-started/installation/)
