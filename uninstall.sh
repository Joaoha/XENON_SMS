#!/usr/bin/env bash
set -euo pipefail

# XENON SMS — Linux Uninstall Script
# Stops containers, removes volumes, and optionally removes the install directory.

INSTALL_DIR="${XENON_INSTALL_DIR:-$HOME/xenon-sms}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[XENON]${NC} $*"; }
warn()  { echo -e "${YELLOW}[XENON]${NC} $*"; }
error() { echo -e "${RED}[XENON]${NC} $*" >&2; }
die()   { error "$@"; exit 1; }

confirm() {
  local prompt="$1"
  local reply
  echo -en "${YELLOW}[XENON]${NC} ${prompt} [y/N] "
  read -r reply
  [[ "$reply" =~ ^[Yy]$ ]]
}

find_compose_cmd() {
  if docker compose version &>/dev/null 2>&1; then
    echo "docker compose"
  elif command -v docker-compose &>/dev/null; then
    echo "docker-compose"
  else
    echo ""
  fi
}

stop_containers() {
  local compose_cmd
  compose_cmd=$(find_compose_cmd)

  if [ -z "$compose_cmd" ]; then
    warn "Docker Compose not found. Attempting direct container removal..."
    docker rm -f xenon-sms xenon_sms-app-1 xenon_sms-db-1 2>/dev/null || true
    return 0
  fi

  if [ ! -f "$INSTALL_DIR/docker-compose.yml" ]; then
    warn "No docker-compose.yml found at $INSTALL_DIR. Skipping compose teardown."
    return 0
  fi

  info "Stopping and removing XENON SMS containers..."
  cd "$INSTALL_DIR"
  $compose_cmd down --volumes --remove-orphans 2>/dev/null || true
}

remove_install_dir() {
  if [ ! -d "$INSTALL_DIR" ]; then
    info "Install directory $INSTALL_DIR does not exist. Nothing to remove."
    return 0
  fi

  if confirm "Remove install directory $INSTALL_DIR and all its contents?"; then
    rm -rf "$INSTALL_DIR"
    info "Removed $INSTALL_DIR"
  else
    info "Kept $INSTALL_DIR"
  fi
}

remove_docker() {
  if ! command -v docker &>/dev/null; then
    return 0
  fi

  if confirm "Remove Docker? (Only do this if no other apps use Docker)"; then
    info "Removing Docker..."
    if command -v apt-get &>/dev/null; then
      sudo apt-get purge -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin 2>/dev/null || true
      sudo apt-get autoremove -y -qq 2>/dev/null || true
    elif command -v dnf &>/dev/null; then
      sudo dnf remove -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin 2>/dev/null || true
    elif command -v yum &>/dev/null; then
      sudo yum remove -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin 2>/dev/null || true
    else
      warn "Could not auto-remove Docker. Remove it manually."
    fi
    info "Docker removed."
  else
    info "Kept Docker."
  fi
}

main() {
  info "XENON SMS Uninstaller"
  echo ""

  if [ "$(id -u)" -eq 0 ]; then
    die "Do not run this script as root. It will use sudo when needed."
  fi

  stop_containers
  remove_install_dir
  remove_docker

  echo ""
  info "XENON SMS has been uninstalled."
}

main "$@"
