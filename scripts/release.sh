#!/bin/bash
# Storylab Release Automation Script
# Creates a proper GitHub release with compiled binaries for all platforms

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REPO="storylab-org/storylab-editor-js"
TEMP_DIR="/tmp/storylab-release-$$"

# Helper functions
log() {
  echo -e "${GREEN}✓${NC} $1"
}

warn() {
  echo -e "${YELLOW}⚠${NC} $1"
}

error() {
  echo -e "${RED}✗${NC} $1"
  exit 1
}

# Get version from package.json
get_version() {
  grep '"version"' package.json | head -1 | sed 's/.*"version": "\([^"]*\)".*/\1/'
}

# Main release procedure
main() {
  echo -e "${YELLOW}Storylab Release Automation${NC}"
  echo "=============================="
  echo ""

  # Check prerequisites
  log "Checking prerequisites..."
  command -v gh >/dev/null 2>&1 || error "GitHub CLI (gh) not found. Install from https://cli.github.com"
  command -v git >/dev/null 2>&1 || error "Git not found"

  # Get version
  VERSION=$(get_version)
  log "Version: $VERSION"

  # Check if tag already exists
  if git rev-parse "v$VERSION" >/dev/null 2>&1; then
    warn "Tag v$VERSION already exists locally"
  fi

  # Check git status
  if [[ -n $(git status -s) ]]; then
    error "Uncommitted changes detected. Commit or stash before release."
  fi

  # Create release tag if needed
  if ! gh release view "v$VERSION" --repo "$REPO" >/dev/null 2>&1; then
    log "Creating release tag v$VERSION..."
    git tag "v$VERSION" || warn "Tag v$VERSION may already exist on remote"
    git push origin "v$VERSION" || warn "Could not push tag (may already exist)"
  else
    warn "Release v$VERSION already exists"
  fi

  # Wait for CI/CD to build
  echo ""
  log "Waiting for CI/CD to build binaries..."
  log "Check GitHub Actions: https://github.com/$REPO/actions"
  echo ""

  read -p "Press ENTER when builds are complete (usually 15-20 minutes)..."

  # Create temp directory
  mkdir -p "$TEMP_DIR"
  cd "$TEMP_DIR"

  # Look for pre-release with binaries
  log "Finding built binaries..."

  # Get the app-v release (from tauri-action)
  APP_TAG=$(gh api repos/$REPO/releases --jq '.[] | select(.prerelease==true and .tag_name | startswith("app-v")) | .tag_name' --repo "$REPO" | head -1)

  if [[ -z "$APP_TAG" ]]; then
    error "No pre-release with binaries found. Check that CI/CD build completed."
  fi

  log "Found binaries in pre-release: $APP_TAG"

  # Download binaries
  log "Downloading binaries..."
  gh release download "$APP_TAG" --repo "$REPO" --pattern "*.dmg" --pattern "*.exe" --pattern "*.msi" --pattern "*.AppImage" --pattern "*.deb" --pattern "*.rpm" --pattern "*.tar.gz" >/dev/null 2>&1

  # Create main release if it doesn't exist
  if ! gh release view "v$VERSION" --repo "$REPO" >/dev/null 2>&1; then
    log "Creating GitHub release..."
    gh release create "v$VERSION" \
      --repo "$REPO" \
      --title "Storylab v$VERSION" \
      --notes "
## Storylab v$VERSION

### ✨ Release Highlights
- TypeScript strict mode compilation complete
- All type safety improvements included
- Production-ready build

### 📦 Download
Compiled applications are available below for your platform.

### 📋 Requirements
- macOS 10.13+
- Windows 10+
- Linux (Ubuntu 18.04+, Fedora, or other distributions)

### 📖 Documentation
See [BUILDING.md](https://github.com/$REPO/blob/main/docs/BUILDING.md) for installation and usage instructions.

### Platform Support
- **macOS:** Intel (x64) and Apple Silicon (ARM64)
- **Windows:** x64 with installer and MSI options
- **Linux:** AppImage, Deb, and RPM packages
" \
      --draft=false \
      --prerelease=false
  fi

  # Upload binaries
  log "Uploading binaries to v$VERSION release..."
  gh release upload "v$VERSION" \
    *.dmg *.exe *.msi *.AppImage *.deb *.rpm *.tar.gz \
    --repo "$REPO" \
    --clobber \
    2>/dev/null || warn "Some files may have already been uploaded"

  # Clean up old pre-release
  if [[ "$APP_TAG" != "" ]]; then
    read -p "Delete old pre-release ($APP_TAG)? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      log "Deleting $APP_TAG..."
      gh release delete "$APP_TAG" --repo "$REPO" -y
    fi
  fi

  # Clean up temp directory
  cd - >/dev/null
  rm -rf "$TEMP_DIR"

  echo ""
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}✓ Release v$VERSION Complete!${NC}"
  echo -e "${GREEN}========================================${NC}"
  echo ""
  echo "📌 Release URL:"
  echo "   https://github.com/$REPO/releases/tag/v$VERSION"
  echo ""
  echo "📥 All binaries are available for download:"
  echo "   - macOS (Intel & Apple Silicon)"
  echo "   - Windows (Installer & MSI)"
  echo "   - Linux (AppImage, Deb, RPM)"
  echo ""
}

# Run main
main "$@"
