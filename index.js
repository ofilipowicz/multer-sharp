/* eslint-disable func-names */
import { Storage } from '@google-cloud/storage';
import Promise from 'bluebird';
import { PassThrough } from 'stream';

import defaultOptions from './config/default';
import sharpOptions from './lib/get-sharp-options';
import getDestination from './lib/get-destination';
import getFilename from './lib/get-filename';
import transformer from './lib/transformer';
import getFormat from './lib/get-format';
import logger from './lib/logger';

class MulterSharp {
  constructor(options) {
    /* eslint-disable no-param-reassign, no-underscore-dangle */
    options.bucket = options.bucket || process.env.GCS_BUCKET || null;
    options.projectId = options.projectId || process.env.GC_PROJECT || null;
    options.keyFilename = options.keyFilename || process.env.GCS_KEYFILE || null;

    this._check(options);

    this.options = Object.assign({}, MulterSharp.defaultOptions, options || {});
    this.getFilename = this.options.filename || getFilename;
    this.sharpOptions = sharpOptions(this.options);

    if (typeof options.destination === 'string') {
      this.getDestination = ($0, $1, cb) => cb(null, options.destination);
    } else {
      this.getDestination = options.destination || getDestination;
    }

    this.gcStorage = new Storage({
      projectId: options.projectId,
      keyFilename: options.keyFilename
    });

    this.gcsBucket = this.gcStorage.bucket(options.bucket);
  }

  _check(options) {
    if (!options.bucket) {
      throw new Error(
        'You have to specify bucket for Google Cloud Storage to work.'
      );
    }

    if (!options.projectId) {
      throw new Error(
        'You have to specify project id for Google Cloud Storage to work.'
      );
    }
  }

  _eachUpload(file, filename, gcName, fileOptions, stream) {
    return (size) => {
      const filenameWithSuffix = `${filename}-${size.suffix}`;
      const gcNameBySuffix = `${gcName}-${size.suffix}`;
      const gcFile = this.gcsBucket.file(gcNameBySuffix);
      const streamCopy = new PassThrough();
      const resizerStream = transformer(this.sharpOptions, size);
      const writableStream = gcFile.createWriteStream(fileOptions);
      stream.pipe(streamCopy);

      return new Promise((resolve, reject) => {
        streamCopy.pipe(resizerStream).pipe(writableStream);
        resizerStream.on('info', logger);
        resizerStream.on('error', function (transformErr) {
          resizerStream.unpipe(writableStream);
          this.end();
          reject(transformErr);
        });

        writableStream.on('error', function (gcErr) {
          this.end();
          reject(gcErr);
        });
        writableStream.on('finish', () => {
          const uri = encodeURI(
            `https://storage.googleapis.com/${
              this.options.bucket
            }/${gcNameBySuffix}`
          );
          resolve({
            mimetype: getFormat(this.sharpOptions.toFormat) || file.mimetype,
            path: uri,
            filename: filenameWithSuffix,
            suffix: size.suffix
          });
        });
      });
    };
  }

  _handleFile(req, file, cb) {
    this.getDestination(req, file, (destErr, destination) => {
      if (destErr) cb(destErr);
      this.getFilename(req, file, (fileErr, filename) => {
        if (fileErr) cb(fileErr);
        const fileOptions = {
          predefinedAcl: this.options.acl,
          metadata: Object.assign(this.options.metadata, {
            contentType: getFormat(this.sharpOptions.toFormat) || file.mimetype
          }),
          gzip: this.options.gzip
        };
        const gcName = typeof destination === 'string' && destination.length > 0
          ? `${destination}/${filename}`
          : filename;
        const gcFile = this.gcsBucket.file(gcName);
        const { stream } = file;
        const resizerStream = transformer(this.sharpOptions, this.options.size);
        const writableStream = gcFile.createWriteStream(fileOptions);
        if (
          Array.isArray(this.options.sizes)
          && this.options.sizes.length > 0
        ) {
          this._uploadWithMultipleSize(
            this.options.sizes,
            file,
            filename,
            gcName,
            fileOptions,
            stream,
            cb
          );
        } else {
          this._uploadOne(
            stream,
            file,
            filename,
            gcName,
            resizerStream,
            writableStream,
            cb
          );
        }
      });
    });
  }

  _removeFile(req, file, cb) {
    this.getDestination(req, file, (destErr, destination) => {
      if (destErr) cb(destErr);
      const gcName = typeof destination === 'string' && destination.length > 0
        ? `${destination}/${file.filename}`
        : file.filename;
      const gcFile = this.gcsBucket.file(gcName);
      gcFile.delete(cb);
    });
  }

  _uploadOne(
    stream,
    file,
    filename,
    gcName,
    resizerStream,
    writableStream,
    cb
  ) {
    stream.pipe(resizerStream).pipe(writableStream);
    resizerStream
      .on('info', logger)
      .on('error', function (transformErr) {
        resizerStream.unpipe(writableStream);
        cb(transformErr);
        this.end();
      });
    writableStream
      .on('error', function (gcErr) {
        cb(gcErr);
        this.end();
      })
      .on('finish', () => {
        const uri = encodeURI(
          `https://storage.googleapis.com/${this.options.bucket}/${gcName}`
        );
        return cb(null, {
          mimetype: getFormat(this.sharpOptions.toFormat) || file.mimetype,
          path: uri,
          filename
        });
      });
  }

  _uploadWithMultipleSize(
    sizes,
    file,
    filename,
    gcName,
    fileOptions,
    stream,
    cb
  ) {
    Promise.map(
      sizes,
      this._eachUpload(file, filename, gcName, fileOptions, stream)
    )
      .then((results) => {
        // All resolve, do something
        const mapArrayToObject = results.reduce((acc, curr) => {
          acc[curr.suffix] = {};
          acc[curr.suffix].path = curr.path;
          acc[curr.suffix].filename = curr.filename;
          return acc;
        }, {});
        cb(null, mapArrayToObject);
        return null;
      })
      .catch(cb);
  }
}

MulterSharp.defaultOptions = defaultOptions;

export default (options) => new MulterSharp(options);
