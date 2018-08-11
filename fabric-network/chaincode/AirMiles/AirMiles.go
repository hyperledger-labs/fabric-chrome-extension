//SPDX-License-Identifier: Apache-2.0

// Import dependencies
// Import the chaincode shim package and the peer protobuf package

/*  This code is based on code written by the Hyperledger Fabric community.
Original code can be found here: https://github.com/hyperledger/fabric-samples/blob/release/chaincode/chaincode_example02/chaincode_example02.go
*/

package main

import (
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	"github.com/hyperledger/fabric/protos/peer"
)

// AirlineMilesChaincode implements a simple chaincode to manage an asset
type AirlineMilesChaincode struct {
}

type user struct {
	Name         string            `json:"Name"`
	AirlineMiles int               `json:"AirlineMiles"`
	Flights      map[string]flight `json:"Flights"`
}

type flight struct {
	Id       string `json:"Id"`
	Airline  string `json:"Airline"`
	Location string `json:"Location"`
	Price    int    `json:"Price"`
}

// Init is called during chaincode instantiation to initialize
// data. We'll be adding more in this function later on.
func (t *AirlineMilesChaincode) Init(stub shim.ChaincodeStubInterface) peer.Response {
	return shim.Success(nil)
}

// Invoke is called per transaction on the chaincode. Each transaction is
// either a 'get' or a 'set' on the asset created by Init function. The Set
// method may create a new asset by specifying a new key-value pair.
func (t *AirlineMilesChaincode) Invoke(stub shim.ChaincodeStubInterface) peer.Response {
	// Extract the function and args from the transaction proposal
	fn, args := stub.GetFunctionAndParameters()

	var result string
	var err error

	switch fn {
	case "initLedger":
		result, err = initLedger(stub)
	case "queryUser":
		result, err = queryUser(stub, args)
	case "queryFlight":
		result, err = queryFlight(stub, args)
	case "queryAllFlights":
		result, err = queryAllFlights(stub)
	case "addUser":
		result, err = addUser(stub, args)
	}
	if err != nil {
		return shim.Error(err.Error())
	}

	// Return the result as success payload
	return shim.Success([]byte(result))
}

func initLedger(stub shim.ChaincodeStubInterface) (string, error) {
	users := map[string]user{}
	flights := map[string]flight{}

	users["Daniel"] = user{
		Name:         "Daniel",
		AirlineMiles: 2000,
		Flights:      map[string]flight{},
	}
	flights["0"] = flight{
		Id:       "0",
		Airline:  "Org1",
		Location: "London",
		Price:    500,
	}
	flights["1"] = flight{
		Id:       "1",
		Airline:  "Org2",
		Location: "Tokyo",
		Price:    750,
	}
	usersAsBytes, _ := json.Marshal(users)
	flightsAsBytes, _ := json.Marshal(flights)
	err := stub.PutState("Users", usersAsBytes)
	er := stub.PutState("Flights", flightsAsBytes)
	if (err != nil) && (er != nil) {
		return "", fmt.Errorf("Failed to intialize ledger")
	}
	return string(flightsAsBytes), err
}

// Set stores the asset (both key and value) on the ledger. If the key exists,
// it will override the value with the new one
func queryUser(stub shim.ChaincodeStubInterface, args []string) (string, error) {
	if len(args) != 1 {
		return "", fmt.Errorf("Incorrect arguments. Expecting a key")
	}

	users := map[string]user{}
	usersAsBytes, err := stub.GetState("Users")
	json.Unmarshal(usersAsBytes, &users)
	selectedUserAsBytes, err := json.Marshal(users[args[0]]) //Require string?

	if err != nil {
		return "", fmt.Errorf("Failed to get asset: %s with error: %s", args[0], err)
	}
	if selectedUserAsBytes == nil {
		return "", fmt.Errorf("Asset not found: %s", args[0])
	}
	return string(selectedUserAsBytes), nil
}

// Get returns the value of the specified asset key
func queryFlight(stub shim.ChaincodeStubInterface, args []string) (string, error) {
	if len(args) != 1 {
		return "", fmt.Errorf("Incorrect arguments. Expecting a id")
	}

	flights := map[string]flight{}
	flightsAsBytes, err := stub.GetState("Flights")
	json.Unmarshal(flightsAsBytes, &flights)
	selectedFlightAsBytes, err := json.Marshal(flights[args[0]])

	if err != nil {
		return "", fmt.Errorf("Failed to get asset: %s with error: %s", args[0], err)
	}
	if selectedFlightAsBytes == nil {
		return "", fmt.Errorf("Asset not found: %s", args[0])
	}
	return string(selectedFlightAsBytes), nil
}

func queryAllFlights(stub shim.ChaincodeStubInterface) (string, error) {

	flightsAsBytes, err := stub.GetState("Flights")

	if err != nil {
		return "", fmt.Errorf("Failed to get assets")
	}
	if flightsAsBytes == nil {
		return "", fmt.Errorf("Assets not found")
	}
	return string(flightsAsBytes), nil //! Possibly change after testing behavior?
}

func addUser(stub shim.ChaincodeStubInterface, args []string) (string, error) {
	if len(args) != 2 {
		return "", fmt.Errorf("Incorrect arguments. Expecting two arguments (name, number of Airline miles)")
	}
	userAirlineMiles, _ := strconv.Atoi(args[1])
	users := map[string]user{}
	usersAsBytes, _ := stub.GetState("Users")
	json.Unmarshal(usersAsBytes, &users)

	users[args[0]] = user{
		Name:         args[0],
		AirlineMiles: userAirlineMiles,
		Flights:      map[string]flight{},
	}
	updatedUsersAsBytes, _ := json.Marshal(users)
	err := stub.PutState("Users", updatedUsersAsBytes)
	if err != nil {
		return "", fmt.Errorf("Failed to set asset: %s", args[0])
	}
	return string(updatedUsersAsBytes), nil
}

func addFlight(stub shim.ChaincodeStubInterface, args []string) (string, error) {
	if len(args) != 4 {
		return "", fmt.Errorf("Incorrect arguments. Expecting four arguments (id, airline, location, price)")
	}
	flights := map[string]flight{}
	flightsAsBytes, _ := stub.GetState("Flights")
	json.Unmarshal(flightsAsBytes, &flights)

	flightPrice, _ := strconv.Atoi(args[3])

	flights[args[0]] = flight{
		Id:       args[0],
		Airline:  args[1],
		Location: args[2],
		Price:    flightPrice,
	}

	updatedFlightAsBytes, _ := json.Marshal(flights)
	err := stub.PutState("Flights", updatedFlightAsBytes)
	if err != nil {
		return "", fmt.Errorf("Failed to set asset: %s", args[0])
	}

	return string(updatedFlightAsBytes), nil
}

func purchaseFlight(stub shim.ChaincodeStubInterface, args []string) (string, error) {
	if len(args) != 2 {
		return "", fmt.Errorf("Incorrect arguments. Expecting two arguments (user name, and flight id)")
	}
	flightsAsBytes, _ := stub.GetState("Flights")
	usersAsBytes, _ := stub.GetState("Users")

	flights := map[string]flight{}
	users := map[string]user{}

	json.Unmarshal(flightsAsBytes, &flights)
	json.Unmarshal(usersAsBytes, &users)

	purchaser := users[args[0]]
	userAirlineMiles := purchaser.AirlineMiles
	selectedFlight := flights[args[1]]
	flightCost := selectedFlight.Price

	if userAirlineMiles >= flightCost {
		purchaser.AirlineMiles = userAirlineMiles - flightCost
		purchaser.Flights[selectedFlight.Id] = selectedFlight
		// Ugly workout because you cannot assign to map index's directly :(
		users[args[0]] = purchaser

		updatedUserAsBytes, _ := json.Marshal(users)
		err := stub.PutState("Users", updatedUserAsBytes)
		if err != nil {
			return "", fmt.Errorf("Failed to set asset: %s", args[0])
		}
		return string(updatedUserAsBytes), nil
	} else {
		return "", fmt.Errorf("User does not have enough funds")
	}
}

// main function starts up the chaincode in the container during instantiate
func main() {
	err := shim.Start(new(AirlineMilesChaincode))
	if err != nil {
		fmt.Println("Could not start Airline Mile Chaincode")
	} else {
		fmt.Println("Airline Mile Chaincode successfully started")
	}
}
