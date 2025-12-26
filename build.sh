#!/bin/bash

SCRIPTPATH=$(cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)

if [[ "$OSTYPE" == "darwin"* ]] && \
	[ "$(command -v brew)" ]; then
	export LIBRARY_PATH=$(brew --prefix llvm@19)/lib
	export LD_RUN_PATH=$(brew --prefix llvm@19)/lib
fi

cd Beef/IDE/dist
BeefBuild -workspace=$SCRIPTPATH