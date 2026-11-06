# docs/Makefile
SPEC_DIR  := spec
BUILD_DIR := build

# Portable (BSD and GNU sed); CI may still pass SPEC_VERSION explicitly.
SPEC_VERSION ?= $(shell sed -n 's/.*\\newcommand{\\specversion}{\([^}]*\)}.*/\1/p' $(SPEC_DIR)/version.tex)

.PHONY: all pdf pdf-tectonic clean version-check

all: pdf

pdf:
	mkdir -p $(BUILD_DIR)
	latexmk -pdf -interaction=nonstopmode -halt-on-error \
	  -output-directory=$(abspath $(BUILD_DIR)) \
	  -cd $(SPEC_DIR)/main.tex
	cp $(BUILD_DIR)/main.pdf \
	  $(BUILD_DIR)/canvasflow-tenant-spec-v$(SPEC_VERSION).pdf

# Local alternative to TeX Live: `brew install tectonic`, then `make pdf-tectonic`.
pdf-tectonic:
	mkdir -p $(BUILD_DIR)
	cd $(SPEC_DIR) && tectonic -X compile main.tex --outdir $(abspath $(BUILD_DIR))
	cp $(BUILD_DIR)/main.pdf \
	  $(BUILD_DIR)/canvasflow-tenant-spec-v$(SPEC_VERSION).pdf

version-check:
	@test -n "$(TAG)" || { echo "Usage: make version-check TAG=spec-v1.0.0"; exit 1; }
	@test "$(TAG)" = "spec-v$(SPEC_VERSION)" \
	  || { echo "Tag $(TAG) != spec-v$(SPEC_VERSION) (from version.tex)"; exit 1; }
	@echo "OK: $(TAG) matches version.tex"

clean:
	rm -rf $(BUILD_DIR)