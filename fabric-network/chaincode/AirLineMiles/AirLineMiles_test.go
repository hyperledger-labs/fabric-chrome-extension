package main

import (
	"fmt"
	"testing"

	"github.com/hyperledger/fabric/core/chaincode/shim"
)

func TestInvokeInit(t *testing.T) {
	fmt.Println("Starting")

	// Instantiate mockStub using CarDemo as the target chaincode to unit test
	stub := shim.NewMockStub("mockStub", new(AirlineMilesChaincode))
	if stub == nil {
		t.Fatalf("MockStub creation failed")
	}

	// Here we perform a "mock invoke" to invoke the function "initVehiclePart" method with associated parameters
	// The first parameter is the function we are invoking
	result := stub.MockInvoke("0.01",
		[][]byte{[]byte("initLedger")})

	// We expect a shim.ok if all goes well
	if result.Status != shim.OK {
		t.Fatalf("Expected unauthorized user error to be returned")
	}

	// here we validate we can retrieve the vehiclePart object we just committed by serianNumber
	valAsbytes, err := stub.GetState("Flights")
	if err != nil {
		t.Errorf("Failed to get state for " + "Flights")
	} else if valAsbytes == nil {
		t.Errorf("Flight does not exist: " + "Flights")
	}

	fmt.Println(string(valAsbytes))

	result_purchase_flight := stub.MockInvoke("0.01",
		[][]byte{[]byte("purchaseFlight"),
			[]byte("Daniel"),
			[]byte("0")})

	if result_purchase_flight.Status != shim.OK {
		t.Fatalf("Expected unauthorized user error to be returned")
	}

	fmt.Println(result_purchase_flight)

	UsersAsBytes, err := stub.GetState("Users")
	if err != nil {
		t.Errorf("Failed to get state for ")
	} else {
		fmt.Println(string(UsersAsBytes))
	}
}
