#include <Servo.h>

Servo ServoFoodBowl1;
Servo ServoFoodBowl2;
Servo ServoFoodDispenser;
Servo ServoLock;
Servo ServoPoopPad1;
Servo ServoPoopPad2;
 
void setup() {
  // Begin stuff
  Serial.begin(9600);
  ServoFoodBowl1.attach(3);
  ServoFoodBowl2.attach(4);
  ServoFoodDispenser.attach(5);
  ServoLock.attach(6);
  ServoPoopPad1.attach(7);
  ServoPoopPad2.attach(8);
  ServoFoodBowl1.write(45);
  delay(500);
  ServoFoodBowl1.write(0);
  ServoLock.write(45);
  delay(500);
  ServoLock.write(0);
  Serial.println("Servo Ready!");
}

void loop() {
  if (Serial.available() != 0) {
    String command = Serial.readString();
    command.trim();
    Serial.flush();
    /*
    Make sure this is in sync with src/ServoController.ts in the main project
    Extend as needed, and modify the TypeScript typedefs accordingly
    */
    if (command == "FoodDispose") {
      FoodDispose();
      Serial.println("FoodDisposeOK");
    } else if (command == "FoodDispense") {
      FoodDispense();
      Serial.println("FoodDispenseOK");
    } else if (command == "DoorLockOpen") {
      DoorLockOpen();
      Serial.println("DoorLockOpenOK");
    } else if (command == "DoorLockClose") {
      DoorLockOpen();
      Serial.println("DoorLockCloseOK");
    } else if (command == "PoopPad1") {
      PoopPad1();
      Serial.println("PoopPad1OK");
    } else if (command == "PoopPad2") {
      PoopPad2();
      Serial.println("PoopPad2OK");
    }
  }
}

void FoodDispose() {
  Serial.println("FoodDisposeStart");
  ServoFoodBowl1.write(90);
  delay(2000);
  ServoFoodBowl2.write(180);
  delay(2000);
  ServoFoodBowl2.write(0);
  delay(2000);
  ServoFoodBowl1.write(0);
}

void FoodDispense() {
  Serial.println("FoodDispenseStart");
  ServoFoodBowl1.write(90);
  delay(2000);
  ServoFoodDispenser.write(45);
  delay(5000);
  ServoFoodDispenser.write(0);
  delay(2000);
  ServoFoodBowl1.write(0);
}

void DoorLockOpen() {
  Serial.println("DoorLockStart");
  ServoLock.write(90);
}
void DoorLockClose() {
  Serial.println("DoorLockStart");
  ServoLock.write(0);
}

void PoopPad1() {
  Serial.println("PoopPad1Start");
  ServoPoopPad1.write(45);
  delay(5000);
  ServoPoopPad1.write(90);
}

void PoopPad2() {
  Serial.println("PoopPad2Start");
  ServoPoopPad2.write(45);
  delay(5000);
  ServoPoopPad2.write(90);
}