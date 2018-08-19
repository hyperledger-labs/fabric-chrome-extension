curl -sSL http://bit.ly/2ysbOFE | bash -s 1.2.0 1.2.0 0.4.10
sleep 5

export PATH=$PWD/bin:$PATH

bash ./startFabric.sh

rm ~/.hfc-key-store/*

node registerAdmin.js
sleep 5
node registerUser.js


node server.js