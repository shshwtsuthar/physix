const Canvas = document.getElementById("myCanvas");
const Context = Canvas.getContext("2d");
const id = Context.createImageData(1, 1); // only do this once per page
const d  = id.data;                        // only do this once per page
d[0]   = 1;
d[1]   = 1;
d[2]   = 1;
d[3]   = 255;

const gpu = new GPU();

// A point in the 2-dimensional space that carries color data
class Point{
    constructor(x, y, color){
        this.x = x;
        this.y = y;
        this.color = color;
    }
}

// An entity is simply a collection of points in the 2-dimensional space
class Entity{
    constructor(points){ 
        this.points = points;
    }
}

class Circle{
    constructor(x, y, radius, color){
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
    }

    Render(){
        for (let radius = 0; radius <= this.radius; radius++){
            // for (let theta = 0; theta <= 90; theta=theta+(0.1)){
            for (let theta = 0; theta <= 90; theta=theta+(1/(radius/24))){ // opt using decreasing the theta incrementation with increase in radius
                // degree 90 is opt using symmetry
                var x = radius * Math.sin(theta * (Math.PI/180))
                var y = radius * Math.cos(theta * (Math.PI/180))

                Context.putImageData(id, this.x + x, this.y + y);
                Context.putImageData(id, this.x - x, this.y - y);
                Context.putImageData(id, this.x + x, this.y - y);
                Context.putImageData(id, this.x - x, this.y + y);
                
                console.log("XYZ");
            }          
        }
    }
}

var Circles = new Circle(x=100, y=100, radius=100, color="red");

const start = Date.now();

Circles.Render();

const end = Date.now();
console.log(`Execution time: ${end - start} ms`);