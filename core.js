const Canvas = document.getElementById("myCanvas");
const Context = Canvas.getContext("2d");

// Define our GPU instance
const gpu = new GPU();

// General function to return the viewport height and width
function getViewport() {

  var viewPortWidth;
  var viewPortHeight;
 
  // The more standards compliant browsers (Mozilla/Netscape/Opera/IE7) use window.innerWidth and window.innerHeight
  if (typeof window.innerWidth != 'undefined') {
    viewPortWidth = window.innerWidth,
    viewPortHeight = window.innerHeight
  }
 
 // IE6 in standards compliant mode (i.e. with a valid doctype as the first line in the document)
  else if (typeof document.documentElement != 'undefined'
  && typeof document.documentElement.clientWidth !=
  'undefined' && document.documentElement.clientWidth != 0) {
     viewPortWidth = document.documentElement.clientWidth,
     viewPortHeight = document.documentElement.clientHeight
  }
 
  // Older versions of IE
  else {
    viewPortWidth = document.getElementsByTagName('body')[0].clientWidth,
    viewPortHeight = document.getElementsByTagName('body')[0].clientHeight
  }
  return [viewPortWidth, viewPortHeight]; // Calling this function, getViewport()[0] is the width, and getViewport()[1] is the height
 }

// A world in Physix is the blank canvas
class World{
  constructor(height, width, color){
    this.height = height;
    this.width = width;
    this.color = color;
  }

  // Render the world onto the viewport
  Render(){
    const WORLD = document.createElement('canvas');
    const CONTEXT = WORLD.getContext("2d");

    WORLD.id = "WORLD"; // Assign this world object an ID
    WORLD.height = this.height;
    WORLD.width = this.width;
    WORLD.style.backgroundColor = this.color;    

    document.body.appendChild(WORLD);
  }
}

// Implementation below
// var Earth = new World(getViewport()[1], getViewport()[0], "aquamarine");
// Earth.Render()

// A point in the 2-dimensional space that carries color data
class Point{
    constructor(x, y, color){
        this.x = x;
        this.y = y;
        this.color = color;
    }

    Render(){
      const r = parseInt(100);
      const g = parseInt(255);
      const b = parseInt(255);

      const renderKernel = gpu.createKernel(function(X, Y, r, g, b) {
        // Get the pixel coordinate we're currently processing
        const x = this.thread.x;
        const y = this.thread.y;
        
        if (X == x && Y == y){
          this.color(r/255, g/255, b/255, 1); // RGBA format normalized to 0-1
        }
      })
      .setOutput([100, 100]) // Output size covers the entire screen
      .setGraphical(true);
      
      // Run the kernel
      renderKernel(this.x, this.y, r, g, b);
      
      // Get the canvas from the kernel and draw it on the main context
      const canvas = renderKernel.canvas;
      Context.drawImage(canvas, this.x, this.y);
    }
}

var P = new Point(50, 50, "red")
// An entity is simply a collection of points in the 2-dimensional space
class Entity{
    constructor(points){ 
        this.points = points;
    }
}

class Circle {
    constructor(x, y, radius, color) {
      this.x = x;
      this.y = y;
      this.radius = radius;
      this.color = color;
    }
  
    Render() {
      const r = parseInt(100);
      const g = parseInt(255);
      const b = parseInt(255);
      
      // Create a GPU kernel for the circle rendering
      const renderKernel = gpu.createKernel(function(centerX, centerY, radius, r, g, b) {
        // Get the pixel coordinate we're currently processing
        const x = this.thread.x;
        const y = this.thread.y;
        
        // Calculate distance from center
        const distance = Math.sqrt((x - centerX) * (x - centerX) + (y - centerY) * (y - centerY));
        
        // If the distance is less than or equal to the radius, color the pixel
        if (distance <= radius) {
          this.color(r/255, g/255, b/255, 1); // RGBA format normalized to 0-1
        } else {
          this.color(0, 0, 0, 0); // Transparent
        }
      })
      .setOutput([1920, 1080]) // Output size covers the entire circle
      .setGraphical(true);
      
      // Run the kernel
      renderKernel(this.x, this.y, this.radius, r, g, b);
      
      // Get the canvas from the kernel and draw it on the main context
      const canvas = renderKernel.canvas;
      Context.drawImage(canvas, this.x - this.radius, this.y - this.radius);
    }
  }
  
  // Example usage
  // const Circles = new Circle(x=100, y=100, radius=200, color="red");
  // const start = Date.now();
  // Circles.Render();
  // const end = Date.now();
  // console.log(`Execution time: ${end - start} ms`);