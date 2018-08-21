#!/bin/bash

# Install Fabric binaries
curl -sSL http://bit.ly/2ysbOFE | bash -s 1.2.0 1.2.0 0.4.10
sleep 5

export PATH=$PWD/bin:$PATH

# start network script
bash ./startFabric.sh
# Remove user log key store before login
rm ~/.hfc-key-store/*

#node scripts for registering Admin and uers
node registerAdmin.js
sleep 5
node registerUser.js
#  Start middleware for Chrome Extension
node server.js