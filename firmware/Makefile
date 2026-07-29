# Makefile for the WayaMe Sound Box Firmware (Simulation)

# Compiler
CC = gcc

# Compiler flags
CFLAGS = -Wall -Isrc -std=c99 -D_GNU_SOURCE

# Source files
SRCS = $(wildcard src/*.c)

# Object files
OBJS = $(SRCS:.c=.o)

# Executable name
TARGET = soundbox_sim

# Dependencies directory
DEPS = $(OBJS:.o=.d)

# Default target
all: $(TARGET)

# Link object files
$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) -o $(TARGET) $(OBJS) -lm
	@echo "Build complete: $(TARGET)"

# Compile source files
%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

# Generate dependencies
%.d: %.c
	@$(CC) $(CFLAGS) -MM $< -MT $@ -o $@

# Include dependencies
-include $(DEPS)

# Clean build artifacts
.PHONY: clean
clean:
	rm -f $(OBJS) $(TARGET) $(DEPS)
	@echo "Clean complete"

# Run the simulation
.PHONY: run
run: all
	@echo "Running Sound Box Firmware Simulation..."
	./$(TARGET)

# Build and run
.PHONY: all-run
all-run: all run

# Debug build
.PHONY: debug
debug: CFLAGS += -g -DDEBUG
debug: $(TARGET)
	@echo "Debug build complete"

# Static analysis
.PHONY: analyze
analyze:
	@echo "Running static analysis..."
	@for src in $(SRCS); do \
		echo "Analyzing $$src..."; \
		$(CC) $(CFLAGS) -fsyntax-only $$src || exit 1; \
	done
	@echo "Static analysis passed"

# Help target
.PHONY: help
help:
	@echo "WayaMe Sound Box Firmware Build System"
	@echo ""
	@echo "Targets:"
	@echo "  all       - Build the firmware simulation (default)"
	@echo "  clean     - Remove build artifacts"
	@echo "  run       - Build and run the simulation"
	@echo "  all-run   - Alias for run"
	@echo "  debug     - Build with debug symbols"
	@echo "  analyze   - Run static analysis on source files"
	@echo "  help      - Show this help message"
	@echo ""
	@echo "Source files:"
	@echo "  $(SRCS)"
