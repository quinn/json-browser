SHELL := /bin/bash

mod.js:
	echo "// Code generated by esbuild. DO NOT EDIT.\n" > mod.js
	deno run -A npm:esbuild@latest mod.ts >> mod.js

clean:
	rm -f mod.js

dev:
	@echo "Starting development processes..."
	@trap 'kill 0' SIGINT; \
		python3 -m http.server 8000 & \
		tailwindcss -i ./input.css -o ./output.css -w & \
		deno run -A npm:esbuild@latest mod.ts --watch=forever --outfile=mod.js & \
		wait

.PHONY: clean dev

.DEFAULT_GOAL := mod.js
