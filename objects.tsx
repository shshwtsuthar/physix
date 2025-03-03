import { GPU } from './gpu.js';

const gpu = new GPU();

// Creating the 2-dimensional velocity vector class
class Velocity{
    vx: number;
    vy: number;

    constructor(vx: number, vy: number){
        this.vx = vx;
        this.vy = vy;
    }
}

// Creating the 2-dimensional velocity vector class
class Acceleration{
    ax: number;
    ay: number;

    constructor(ax: number, ay: number){
        this.ax = ax;
        this.ay = ay;
    }
}

// Creating the entity class 
class Entity{
    x: number;
    y: number;
    acceleration: Acceleration;
    velocity: Velocity;


    constructor(x: number, y: number, vx: number, vy: number, ax: number, ay: number){
        this.x = x;
        this.y = y;
        this.velocity = new Velocity(vx, vy);
        this.acceleration = new Acceleration(ax, ay);
    }
}