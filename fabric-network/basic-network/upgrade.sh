export PEER = peer0.org1.example.com
export CH_NAME = mychannel
docker stop $PEER
docker-compose -f docker-compose.yml up -d --no-deps $PEER
peer channel update -f config_update_in_envelope.pb -c $CH_NAME -o orderer.example.com:7050 