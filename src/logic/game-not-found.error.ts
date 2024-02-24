
export default class GameNotFoundError extends Error {
    constructor() {
        super('Game not found');
    }
}
