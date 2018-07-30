#!/bin/bash
#
# SPDX-License-Identifier: Apache-2.0
# This code is based on code written by the Hyperledger Fabric community. 
# Original code can be found here: https://github.com/hyperledger/fabric-samples/blob/release/fabcar/startFabric.sh
#
# Exit on first error

set -e

# don't rewrite paths for Windows Git Bash users
export MSYS_NO_PATHCONV=1

starttime=$(date +%s)

if [ ! -d ~/.hfc-key-store/ ]; then
	mkdir ~/.hfc-key-store/
fi

# launch network; create channel and join peer to channel
cd ../basic-network
./start.sh

# Now launch the CLI container in order to install, instantiate chaincode
# and prime the ledger with our 10 tuna catches

# docker-compose -f ./docker-compose.yml up #VERY IMPORTANT ASK ABOUT THIS!!!!! Need this to run chaincode
docker-compose -f ./docker-compose.yml up -d cli

# cd ../Boat-app
# echo "Deleting Previous Keys"
# rm ~/.hfc-key-store/*
# echo "Registering Admin and User"
# node registerAdmin.js
# sleep 10
# node registerUser.js
# sleep 10

# cd ../basic-network
# docker exec -it cli bash
# echo "Installing ChainCode on Peers"


printf "\nTotal execution time : $(($(date +%s) - starttime)) secs ...\n\n"
printf "\nStart with the registerAdmin.js, then registerUser.js, then server.js\n\n"