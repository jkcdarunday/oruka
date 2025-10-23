#!/bin/sh
docker run --rm -it -v ${PWD}/.cache:/root/.cache -v ${PWD}:/project electronuserland/builder:wine /bin/bash -c "npm install && npm run build"
