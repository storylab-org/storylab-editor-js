# Storylab Scripts

Utility scripts for Storylab development and release.

## Release Script

Automates the complete release workflow for publishing v0.2.x releases to GitHub.

### Usage

```bash
# From project root:
./scripts/release.sh

# Or add to your .zshrc/.bashrc for convenience:
alias storylab-release='/path/to/storylab/scripts/release.sh'
storylab-release
```

### What It Does

1. **Validates prerequisites** - Checks for `gh` CLI and git
2. **Extracts version** - Reads from `package.json`
3. **Creates git tag** - Tags commit as `v<version>`
4. **Waits for builds** - Guides you to GitHub Actions
5. **Downloads binaries** - Fetches built apps from CI/CD pre-release
6. **Creates release** - Publishes proper GitHub release
7. **Uploads assets** - Attaches binaries to release
8. **Cleans up** - Optionally deletes old pre-release

### Requirements

- GitHub CLI: `brew install gh`
- Git
- Proper `gh` authentication: `gh auth login`

### Release Workflow

1. **Update version** in `package.json` and `src-tauri/Cargo.toml`:
   ```json
   "version": "0.2.95"
   ```

2. **Commit and push**:
   ```bash
   git add package.json src-tauri/Cargo.toml
   git commit -m "chore: bump version to 0.2.95"
   git push origin main
   ```

3. **Run release script**:
   ```bash
   ./scripts/release.sh
   ```

4. **Wait for builds** (~15-20 minutes for all platforms)

5. **Confirm when builds complete** - Script will wait for your input

6. **Done!** - Release is published with all binaries

### What Gets Released

- **macOS**: DMG installers + app bundles (Intel & ARM64)
- **Windows**: EXE installer + MSI package
- **Linux**: AppImage + Deb + RPM packages

### Troubleshooting

**"GitHub CLI not found"**
```bash
brew install gh
gh auth login
```

**"Uncommitted changes detected"**
```bash
git status
git add .
git commit -m "..."
git push
```

**"No pre-release with binaries found"**
- Check GitHub Actions: https://github.com/storylab-org/storylab-editor-js/actions
- Wait for all jobs to complete (usually 15-20 min)
- Jobs must all show ✓ (green checkmarks)

**Release already exists**
- Script will skip creation if release already exists
- You can manually upload binaries: `gh release upload v0.2.95 *.dmg *.exe ...`

### Notes

- First time? Read the inline prompts carefully
- Script uses temporary directory (`/tmp/storylab-release-$$`) - cleaned up automatically
- Binaries are ~80MB each - first download takes a moment
- Safe to run multiple times (skips existing steps)

## Other Scripts

Coming soon:
- `build.sh` - Local builds for testing
- `test.sh` - Run all test suites
- `ci-check.sh` - Pre-commit validation
