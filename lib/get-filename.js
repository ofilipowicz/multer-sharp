import crypto from 'crypto';

export default (req, file, cb) => {
  crypto.pseudoRandomBytes(16, (err, raw) => {
    cb(err, err ? undefined : raw.toString('hex'));
  });
};
