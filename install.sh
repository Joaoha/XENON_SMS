#!/usr/bin/env bash
set -euo pipefail

# XENON SMS — Linux Install Script (Docker-based)
# Installs Docker if missing, clones the repo, generates config, and starts the app.

REPO_URL="https://github.com/Joaoha/XENON_SMS.git"
INSTALL_DIR="${XENON_INSTALL_DIR:-$HOME/xenon-sms}"
PORT="${XENON_PORT:-3000}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[XENON]${NC} $*"; }
warn()  { echo -e "${YELLOW}[XENON]${NC} $*"; }
error() { echo -e "${RED}[XENON]${NC} $*" >&2; }
die()   { error "$@"; exit 1; }

check_root() {
  if [ "$(id -u)" -eq 0 ]; then
    die "Do not run this script as root. It will use sudo when needed."
  fi
}

detect_pkg_manager() {
  if command -v apt-get &>/dev/null; then
    echo "apt"
  elif command -v dnf &>/dev/null; then
    echo "dnf"
  elif command -v yum &>/dev/null; then
    echo "yum"
  else
    echo "unknown"
  fi
}

install_docker() {
  if command -v docker &>/dev/null; then
    info "Docker is already installed: $(docker --version)"
    return 0
  fi

  info "Installing Docker..."
  local pkg_mgr
  pkg_mgr=$(detect_pkg_manager)

  case "$pkg_mgr" in
    apt)
      sudo apt-get update -qq
      sudo apt-get install -y -qq ca-certificates curl gnupg
      sudo install -m 0755 -d /etc/apt/keyrings
      curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg 2>/dev/null || true
      sudo chmod a+r /etc/apt/keyrings/docker.gpg
      # Works for Ubuntu and Debian
      local distro
      distro=$(. /etc/os-release && echo "$ID")
      echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$distro $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
        sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
      sudo apt-get update -qq
      sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
      ;;
    dnf|yum)
      sudo "$pkg_mgr" install -y -q dnf-plugins-core 2>/dev/null || true
      sudo "$pkg_mgr" config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo 2>/dev/null || \
        sudo "$pkg_mgr" config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo 2>/dev/null || true
      sudo "$pkg_mgr" install -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin
      ;;
    *)
      die "Unsupported package manager. Install Docker manually: https://docs.docker.com/engine/install/"
      ;;
  esac

  sudo systemctl enable --now docker
  sudo usermod -aG docker "$USER"
  info "Docker installed. You may need to log out and back in for group changes."
}

install_git() {
  if command -v git &>/dev/null; then
    return 0
  fi

  info "Installing git..."
  local pkg_mgr
  pkg_mgr=$(detect_pkg_manager)

  case "$pkg_mgr" in
    apt)       sudo apt-get install -y -qq git ;;
    dnf|yum)   sudo "$pkg_mgr" install -y -q git ;;
    *)         die "Install git manually and re-run this script." ;;
  esac
}

clone_repo() {
  if [ -d "$INSTALL_DIR/.git" ]; then
    info "Existing installation found at $INSTALL_DIR — pulling latest..."
    git -C "$INSTALL_DIR" pull --ff-only || warn "Pull failed; using existing checkout."
    return 0
  fi

  if [ -e "$INSTALL_DIR" ]; then
    die "$INSTALL_DIR already exists and is not a XENON SMS checkout. Remove it first or set XENON_INSTALL_DIR."
  fi

  info "Cloning XENON SMS to $INSTALL_DIR..."
  git clone "$REPO_URL" "$INSTALL_DIR"
}

generate_env() {
  local env_file="$INSTALL_DIR/.env"

  if [ -f "$env_file" ]; then
    info ".env already exists — skipping generation."
    return 0
  fi

  info "Generating .env with random secrets..."
  local auth_secret pg_password
  auth_secret=$(openssl rand -base64 32)
  pg_password=$(openssl rand -base64 24 | tr -d '/+=')

  cat > "$env_file" <<EOF
DATABASE_URL="postgresql://xenon:${pg_password}@db:5432/xenon_sms"
AUTH_SECRET="${auth_secret}"
POSTGRES_PASSWORD="${pg_password}"
PORT=${PORT}
EOF

  chmod 600 "$env_file"
  info ".env created at $env_file"
}

docker_cmd() {
  if docker info &>/dev/null 2>&1; then
    "$@"
  else
    sudo "$@"
  fi
}

start_app() {
  info "Starting XENON SMS..."
  cd "$INSTALL_DIR"

  # Use 'docker compose' (v2 plugin) or fall back to 'docker-compose'
  if docker compose version &>/dev/null 2>&1 || sudo docker compose version &>/dev/null 2>&1; then
    COMPOSE="docker compose"
  elif command -v docker-compose &>/dev/null; then
    COMPOSE="docker-compose"
  else
    die "Neither 'docker compose' nor 'docker-compose' found."
  fi

  docker_cmd $COMPOSE up -d --build

  info "Waiting for the app to become healthy..."
  local retries=30
  while [ $retries -gt 0 ]; do
    if curl -sf "http://localhost:${PORT}" &>/dev/null; then
      break
    fi
    retries=$((retries - 1))
    sleep 2
  done

  if [ $retries -eq 0 ]; then
    warn "App did not respond within 60s. Check logs: docker compose logs app"
  fi
}

print_summary() {
  echo ""
  info "============================================"
  info "  XENON SMS is running!"
  info "============================================"
  info ""
  info "  URL:       http://localhost:${PORT}"
  info "  Install:   $INSTALL_DIR"
  info ""
  info "  Create your first admin user:"
  info "    curl -X POST http://localhost:${PORT}/api/seed \\"
  info "      -H 'Content-Type: application/json' \\"
  info "      -d '{\"username\": \"admin\", \"password\": \"changeme\"}'"
  info ""
  info "  Manage:"
  info "    cd $INSTALL_DIR"
  info "    docker compose logs -f    # view logs"
  info "    docker compose stop       # stop"
  info "    docker compose start      # start"
  info ""
  info "  To uninstall: $INSTALL_DIR/uninstall.sh"
  info "============================================"
}

main() {
  info "XENON SMS Installer"
  echo ""

  check_root
  install_git
  install_docker
  clone_repo
  generate_env
  start_app
  print_summary
}

main "$@"
