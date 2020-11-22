// quick and simple snowflake-like id generation
// we're dealing with very few interactions, no need to go extreme
// not like this is efficient enough to generate more than 3000 IDs per second

const epoch = 1577836800000n;

const randomBits = 10n;
const sequenceBits = 12n;

const randomLimit = -1n ^ (-1n << randomBits);
const sequenceLimit = -1n ^ (-1n << sequenceBits);

const sequenceShift = randomBits;
const timestampShift = randomBits + sequenceBits;

let lastTimestamp = 0n;
let sequence = 0n;
let random = 0n;

const generateId = () => {
  const timestamp = BigInt(Date.now());
  if (timestamp > lastTimestamp) {
    sequence = 0n;
  }
  if (timestamp === lastTimestamp) {
    sequence = (sequence + 1n) & sequenceLimit;
  }
  lastTimestamp = timestamp;
  random = BigInt(Math.floor(Math.random() * Number(randomLimit)));
  return String(
    ((timestamp - epoch) << timestampShift) |
    (sequence << sequenceShift) |
    random
  );
};

module.exports = generateId;