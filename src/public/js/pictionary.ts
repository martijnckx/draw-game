import PictionaryServerConnection from './server-connection';
import Notifier from './notifier';

type PixelData = {
    width: number,
    height: number,
    data: Uint32Array,
};

type Scores = {
    drawer_scores: any,
    guesser_scores: any,
};

export default class Pictionary {
    private app: any;
    private notifier: Notifier;
    public serverConnection: PictionaryServerConnection;

    private c: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private paint: boolean = false;

    private drawingId: string = '';

    private currX: number = 0;
    private currY: number = 0;
    private prevX: number = 0;
    private prevY: number = 0;

    public secondsPerRound: number = 0;
    public colour: string = 'black';
    public eraser: boolean = false;
    public fillBucket: boolean = false;
    private paintThickness: number = 4;
    private eraserThickness: number = 36;
    private startTime: Date | null = null;

    private clearCanvasTimeout: NodeJS.Timeout | null = null;
    private afterClearCanvasTimeout: NodeJS.Timeout | null = null;

    private lastChatMessageTime: Date | null = null;

    private scores: Scores = {drawer_scores: {}, guesser_scores: {}};

    // private myVideo: HTMLMediaElement = document.createElement('video');
    // private otherVideos: HTMLMediaElement[] = [];

    private myStreamReady: boolean = false;

    // private this.app.myStream: MediaStream = undefined;

    constructor (app: any, notifier: Notifier) {
        this.notifier = notifier;
        this.app = app;
        this.serverConnection = new PictionaryServerConnection();

        this.c = this.getCanvasElementById('canvas');
        this.ctx = this.getCanvasRenderingContext2D(this.c);

        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 1;

        this.clearCanvas();
        this.createUserEvents();
    }

    public setDrawingId(id: string) {
        this.drawingId = id;
    }

    public secondsLeft(): number {
        if (this.startTime === null) return -1;
        return this.secondsPerRound - Math.round(this.secondsBetweenDates(this.startTime, new Date()));
    }

    public setStartTime(t: Date) {
        this.startTime = t;
    }

    public setSecondsPerRound(s: number) {
        this.secondsPerRound = s;
    }

    public setScores(scores: Scores) {
        this.scores = scores;
        console.log(this.scores);
    }

    public getScore(type: 'drawer' | 'guesser', playerId: string): number {
        if (type === 'drawer') {
            return this.scores.drawer_scores[playerId];
        } else {
            return this.scores.guesser_scores[playerId];
        }
    }

    public startClearCanvas() {
        if (this.afterClearCanvasTimeout !== null) clearTimeout(this.afterClearCanvasTimeout);
        this.app.clearCanvasLoading = true;
        this.clearCanvasTimeout = setTimeout(this.doClearCanvas.bind(this), 1000);
    }

    public stopClearCanvas() {
        this.app.clearCanvasLoading = false;
        if (this.clearCanvasTimeout !== null) clearTimeout(this.clearCanvasTimeout);
    }
    

    private doClearCanvas() {
        this.clearCanvas();
        this.serverConnection.sendClearCanvas();
        this.afterClearCanvasTimeout = setTimeout((() => {
            this.app.clearCanvasLoading = false;
        }).bind(this), 300);
    }

    public getTopDrawer(): string {
        let topDrawer = '';
        let topScore  = 0;
        for (let drawer in this.scores.drawer_scores) {
            if (this.scores.drawer_scores[drawer] > topScore) {
                topDrawer = drawer;
            }
        }
        return topDrawer;
    }

    public getTopGuesser(): string {
        let topGuesser = '';
        let topScore = 0;
        for (let guesser in this.scores.guesser_scores) {
            if (this.scores.guesser_scores[guesser] > topScore) {
                topGuesser = guesser;
            }
        }
        return topGuesser;
    }

    public addChatMessage(id: string, content: string) {
        const objDiv = document.getElementById("chat");
        const isScrolled = objDiv? objDiv.clientHeight < objDiv.scrollHeight && objDiv.scrollTop + 30 <= objDiv.scrollHeight - objDiv.offsetHeight : false;
        (this.app.messages as any).push({
            'id': id,
            'content': content,
        });
        setTimeout(() => {
            if (objDiv) {
                if (!isScrolled)
                    objDiv.scrollTop = objDiv.scrollHeight;
                else {
                    if (this.lastChatMessageTime === null || this.secondsBetweenDates(new Date(), this.lastChatMessageTime) > 2)
                        this.notifier.info("Nieuw onglezen bericht", 2);
                }
            }
            this.lastChatMessageTime = new Date();
        }, 10);
    }

    private secondsBetweenDates(t1: Date, t2: Date) {
        const dif = t1.getTime() - t2.getTime();
        const seconds = dif / 1000;
        const secondsAbs = Math.abs(seconds);
        return secondsAbs;
    }

    private getCanvasRenderingContext2D = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
        const context = canvas.getContext('2d');

        if (context === null) {
            throw new Error('This browser does not support 2-dimensional canvas rendering contexts.');
        }

        return context;
    };

    private getCanvasElementById = (id: string): HTMLCanvasElement => {
        const canvas = document.getElementById(id);

        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new Error(`The element of id "${id}" is not a HTMLCanvasElement. Make sure a <canvas id="${id}""> element is present in the document.`);
        }

        return canvas;
    };

    private createUserEvents () {
        let canvas = this.c;

        console.log(canvas);
        canvas.addEventListener('mousedown', this.pressEventHandler);
        canvas.addEventListener('mousemove', this.dragEventHandler);
        canvas.addEventListener('mouseup', this.releaseEventHandler);
        canvas.addEventListener('mouseout', this.cancelEventHandler);

        canvas.addEventListener('touchstart', this.pressEventHandler);
        canvas.addEventListener('touchmove', this.dragEventHandler);
        canvas.addEventListener('touchend', this.releaseEventHandler);
        canvas.addEventListener('touchcancel', this.cancelEventHandler);
    }

    public clearCanvas () {
        this.app.eraser = false;
        this.app.fillBucket = false;
        this.paint = false;
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.c.width, this.c.height);
    }

    private releaseEventHandler = () => {
        if (this.drawingId !== this.app.me.id) return;
        this.paint = false;
    };

    private cancelEventHandler = () => {
        if (this.drawingId !== this.app.me.id) return;
        this.paint = false;
    };

    private pressEventHandler = (e: MouseEvent | TouchEvent) => {
        if (this.drawingId !== this.app.me.id) return;
        let mouseX = (e as TouchEvent).changedTouches ? (e as TouchEvent).changedTouches[0].clientX : (e as MouseEvent).clientX;
        let mouseY = (e as TouchEvent).changedTouches ? (e as TouchEvent).changedTouches[0].clientY : (e as MouseEvent).clientY;
        mouseX -= this.c.getBoundingClientRect().left;
        mouseY -= this.c.getBoundingClientRect().top;

        this.prevX = this.currX;
        this.prevY = this.currY;
        this.currX = mouseX;
        this.currY = mouseY;

        if (this.app.fillBucket) {
            this.floodFill(this.currX, this.currY);
            this.serverConnection.sendCoordinates(this.prevX, this.prevY, this.currX, this.currY);
            return;
        }

        this.paint = true;
    };

    private dragEventHandler = (e: MouseEvent | TouchEvent) => {
        if (this.drawingId !== this.app.me.id) return;
        let mouseX = (e as TouchEvent).changedTouches ? (e as TouchEvent).changedTouches[0].clientX : (e as MouseEvent).clientX;
        let mouseY = (e as TouchEvent).changedTouches ? (e as TouchEvent).changedTouches[0].clientY : (e as MouseEvent).clientY;
        mouseX -= this.c.getBoundingClientRect().left;
        mouseY -= this.c.getBoundingClientRect().top;

        if (this.app.fillBucket) return;

        if (this.paint) {
            this.prevX = this.currX;
            this.prevY = this.currY;
            this.currX = mouseX;
            this.currY = mouseY;
            this.draw(this.prevX, this.prevY, this.currX, this.currY);
            this.serverConnection.sendCoordinates(this.prevX, this.prevY, this.currX, this.currY);
        }

        e.preventDefault();
    };

    private getPixel(pixelData: PixelData, x: number, y: number) {
        if (x < 0 || y < 0 || x >= pixelData.width || y >= pixelData.height) {
          return -1;  // impossible color
        } else {
          return pixelData.data[y * pixelData.width + x];
        }
    }

    // private colorsSimilar(c1: number, c2: number, percentTreshold?: number): boolean {
    //     if (!percentTreshold) percentTreshold = 0.2;
    //     if (!c1 && !c2) return true;
    //     else if (!c1 || !c2) return false;
    //     const c1string = c1.toString(16);
    //     const c2string = c2.toString(16);
    //     const color1 = {
    //         r: parseInt(`${c1string[6]}${c1string[7]}`, 16),
    //         g: parseInt(`${c1string[4]}${c1string[5]}`, 16),
    //         b: parseInt(`${c1string[2]}${c1string[3]}`, 16),
    //         a: parseInt(`${c1string[0]}${c1string[1]}`, 16),
    //     };
    //     const color2 = {
    //         r: parseInt(`${c2string[6]}${c2string[7]}`, 16),
    //         g: parseInt(`${c2string[3]}${c2string[5]}`, 16),
    //         b: parseInt(`${c2string[2]}${c2string[3]}`, 16),
    //         a: parseInt(`${c2string[0]}${c2string[1]}`, 16),
    //     };
    //     const dr = (Math.abs(color1.r - color2.r)) / 255;
    //     const dg = (Math.abs(color1.g - color2.g)) / 255;
    //     const db = (Math.abs(color1.b - color2.b)) / 255;
    //     const da = (Math.abs(color1.a - color2.a)) / 255;
    //     console.log(`Differences for RGB are (${dr}, ${dg}, ${db}, ${da})`);
    //     return dr <= percentTreshold && dg <= percentTreshold && db <= percentTreshold && da <= percentTreshold;
    // }

    // This floodfill is a slightly modified version of
    // http://jsfiddle.net/greggman/wpfd8he1/
    // We added anti-aliasing ourselves for a better floodfill (commented function colorsSimilar above),
    // but it was way slower and not much beneficial
      ​
    private floodFill(x: number, y: number) {
        const ctx = this.ctx;
        // Get the correct color
        let fillColor: number = 0xFF000000;
        switch(this.app.colour) {
            case 'black': { fillColor = 0xFF000000; break; }
            case 'red': { fillColor = 0xFF0000FF; break; }
            case 'green': { fillColor = 0xFF008000; break; }
            case 'blue': { fillColor = 0xFFFF0000; break; }
            case 'yellow': { fillColor = 0xFF00FFFF; break; }
            case 'brown': { fillColor = 0xFF2A2AA5; break; }
            case 'purple': { fillColor = 0xFF800080; break; }
            case 'white': { fillColor = 0xFFFFFFFF; break; }
            case 'orange': { fillColor = 0xFF00A5FF; break; }
            default: { fillColor = 0xFF000000; break; }
        }

        // read the pixels in the canvas
        const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // make a Uint32Array view on the pixels so we can manipulate pixels
        // one 32bit value at a time instead of as 4 bytes per pixel
        const pixelData = {
          width: imageData.width,
          height: imageData.height,
          data: new Uint32Array(imageData.data.buffer),
        };
        
        // get the color we're filling
        const targetColor = this.getPixel(pixelData, x, y);
        
        // check we are actually filling a different color
        // if (!this.colorsSimilar(targetColor, fillColor)) {
        if (targetColor !== fillColor) {
        
          const pixelsToCheck = [x, y];
          while (pixelsToCheck.length > 0) {
            const y = pixelsToCheck.pop();
            const x = pixelsToCheck.pop();
            
            const currentColor = this.getPixel(pixelData, x!, y!);
            // if (this.colorsSimilar(targetColor, currentColor)) {
            if (currentColor === targetColor) {
              pixelData.data[y! * pixelData.width + x!] = fillColor;
              pixelsToCheck.push(x! + 1, y!);
              pixelsToCheck.push(x! - 1, y!);
              pixelsToCheck.push(x!, y! + 1);
              pixelsToCheck.push(x!, y! - 1);
            }
          }
          
          // put the data back
          ctx.putImageData(imageData, 0, 0);
        }
      }
      

    public draw(fromX: number, fromY: number, toX: number, toY: number) {
        if (!this.app) return;
        if (this.app.fillBucket) {this.floodFill(toX, toY); return;}
        this.ctx.beginPath();
        this.ctx.moveTo(fromX, fromY);
        this.ctx.lineTo(toX, toY);
        this.ctx.strokeStyle = this.app.eraser ? 'white' : this.app.colour;
        this.ctx.lineWidth = this.app.eraser ? this.eraserThickness : this.paintThickness;
        this.ctx.stroke();
        this.ctx.closePath();
    }

    public setColour (c: string) {
        this.app.colour = c;
    }

    public useEraser (e: boolean) {
        this.app.eraser = e;
        this.app.fillBucket = false;
    }

    public useFillBucket (b: boolean) {
        this.app.fillBucket = b;
        this.app.eraser = false;
    }
}
