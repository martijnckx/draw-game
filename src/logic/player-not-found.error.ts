
export default class PlayerNotFoundError extends Error {
    constructor() {
        super('Player not found');
    }
}
