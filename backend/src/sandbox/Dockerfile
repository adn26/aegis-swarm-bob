# Use a lightweight Node.js image as the base
FROM node:18-alpine

# Install basic security tools and utilities
RUN apk add --no-cache \
    patch \
    git \
    python3 \
    make \
    g++ \
    curl

# Create a non-privileged user to run tests
# The node image already has a 'node' user with uid 1000
USER node

# Set working directory
WORKDIR /workspace

# Set environment variables
ENV NODE_ENV=test

# Default command (overridden by sandbox service)
CMD ["node", "--version"]

# Made with Bob
