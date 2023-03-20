import * as fs from "fs";

export class DB {
  constructor(path, init) {
    this.path = path;
    this.state = init;
    this.init();
  }
  init() {
    if (!fs.existsSync(this.path)) {
      this.push();
    } else {
      this.pull();
    }
  }
  pull() {
    this.state = JSON.parse(fs.readFileSync(this.path).toString());
  }
  push() {
    fs.writeFileSync(this.path, JSON.stringify(this.state));
  }
  update(fn) {
    this.pull();
    this.state = fn(this.state);
    this.push();
  }
  get(fn) {
    return fn(this.state);
  }
  append(fn, val) {
    this.pull();
    const arr = fn(this.state);
    arr.push(val);
    this.push();
  }
  remove(fn, index) {
    this.pull();
    const arr = fn(this.state);
    arr.splice(index, 1);
    this.push();
  }
}
