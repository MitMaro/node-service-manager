#!/usr/bin/env bash

cd "$(dirname "${BASH_SOURCE[0]}")" && source "./common.bash"

rm -rf "docs/"
ensure-directory "docs/"

typedoc \
	--name "Node Service Manager" \
	--module "commonjs" \
	--ignoreCompilerErrors \
	--mode file \
	--target "ES6" \
	--theme minimal \
	--excludeExternals \
	--excludePrivate \
	--exclude "test/**/*.ts" \
	--out "docs/" \
	src/
