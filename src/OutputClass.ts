class OutputClass {
      constructor(app, outputName, outputDescription = "") {
         this.output = [];
      }
   
      addOutput(output) {
         this.output.push(output);
      }
   
      getOutput() {
         return this.output;
      }
}