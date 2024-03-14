class WindowState {
  windowPositionsKey = 'windowPositionsKey';
  activeWindowsKey = 'activeWindowsKey';
  pauseWindowsKey = 'pauseWindowsKey';

  getActiveWindows() {
    return JSON.parse(localStorage.getItem(this.activeWindowsKey)) ?? [];
  }

  saveActiveWindows(activeWindows) {
    localStorage.setItem(this.activeWindowsKey, JSON.stringify(activeWindows));
  }

  getPause() {
    const pauseValue = localStorage.getItem(this.pauseWindowsKey);
    return pauseValue ? +pauseValue : null;
  }

  setPause(windowNumber) {
    localStorage.setItem(this.pauseWindowsKey, windowNumber.toString());
  }

  removePause() {
    localStorage.removeItem(this.pauseWindowsKey);
  }

  getAllPositions() {
    const json = localStorage.getItem(this.windowPositionsKey);
    const allPositions = json ? new Map(Object.entries(JSON.parse(json))) : new Map();
    const activeWindows = this.getActiveWindows();
    const activePositions = new Map();
    const positionsToRemove = [];

    allPositions.forEach((_, key) => {
      if (!activeWindows.includes(+key)) {
        positionsToRemove.push(key);
      }
    });

    positionsToRemove.forEach(key => allPositions.delete(key));

    return allPositions;
  }

  saveAllPositions(allPositions) {
    localStorage.setItem(this.windowPositionsKey, JSON.stringify(Object.fromEntries(allPositions)));
  }
}

class WindowManager {
  currentWindowNumber;
  savingPositionInterval;
  renderingInterval;
  state = new WindowState();

  attach() {
    const activeWindows = this.state.getActiveWindows();
    this.currentWindowNumber = activeWindows.length + 1;
    this.pauseOtherWindows();
    activeWindows.push(this.currentWindowNumber);
    this.state.saveActiveWindows(activeWindows);
    this.saveCurrentPosition();
    this.resumeOtherWindows()
  }

  pauseOtherWindows() {
    this.state.setPause(this.currentWindowNumber);
  }

  resumeOtherWindows() {
    this.state.removePause();
  }

  shouldWait() {
    const pauseValue = this.state.getPause();
    return pauseValue && pauseValue !== this.currentWindowNumber;
  }

  detach() {
    this.pauseOtherWindows();
    const activeWindows = this.state.getActiveWindows().filter(w => w !== this.currentWindowNumber);
    this.state.saveActiveWindows(activeWindows);
    this.resumeOtherWindows();
  }

  detachOnUnload() {
    window.addEventListener('unload', () => {
      if (this.savingPositionInterval) {
        clearInterval(this.savingPositionInterval);
      }

      if (this.renderingInterval) {
        clearInterval(this.renderingInterval);
      }

      this.detach();
    });
  }

  triggerSavingPositionInterval(interval = 150) {
    this.savingPositionInterval = setInterval(() => {
      if (!this.shouldWait()) {
        this.saveCurrentPosition();
      }
    }, interval);
  }

  getPosition() {
    return {
      top: window.screenTop,
      left: window.screenLeft,
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  saveCurrentPosition() {
    const position = this.getPosition();
    const allPositions = this.state.getAllPositions();
    allPositions.set(this.currentWindowNumber, position);
    this.state.saveAllPositions(allPositions);
  }

  triggerRenderingInterval(interval = 150) {
    this.renderingInterval = setInterval(() => {
      if (!this.shouldWait()) {
        this.render()
      }
    }, interval);
  }

  render() {
    const body = document.getElementById('root');

    if (!body) {
      return;
    }

    // Clear content
    body.replaceChildren();

    const position = this.getPosition();
    this.renderDiv(position.height / 2, position.width / 2);

    const screenX = position.left + position.width / 2;
    const screenY = position.top + position.height / 2;
    const allPositions = this.state.getAllPositions();
    const otherWindowPositionKeys = [...allPositions.keys()].filter(key => key != this.currentWindowNumber);

    otherWindowPositionKeys.forEach(key => {
      const otherPosition = allPositions.get(key);

      if (otherPosition) {
        const x = otherPosition.left + otherPosition.width / 2;
        const y = otherPosition.top + otherPosition.height / 2;
        const top = position.height / 2 + (y - screenY);
        const left = position.width / 2 + (x - screenX);
        this.renderDiv(top, left);
      }
    });
  }

  renderDiv(top, left) {
    const div = document.createElement('div');
    div.style.width = '100px';
    div.style.height = '100px';
    div.style.position = 'fixed';
    div.style.backgroundColor = 'black';
    div.style.top = `${top}px`;
    div.style.left = `${left}px`;

    document.getElementById('root').appendChild(div);
  }
}


const manager = new WindowManager();
manager.attach();
manager.detachOnUnload();
manager.triggerSavingPositionInterval();
manager.triggerRenderingInterval();
