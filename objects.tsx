class Velocity{
    x: number;
    y: number;

    constructor(x: number, y: number){
        
    }
}

class Entity{
    x: number;
    y: number;
    acceleration: number[];
    velocity: number[];


    constructor(x: number, y: number){
        this.x = x;
        this.y = y;
    }
}