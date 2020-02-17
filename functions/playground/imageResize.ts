      // https://www.youtube.com/watch?v=OKW8x8-qYs0&t=306s

      import * as functions from 'firebase-functions';

      import * as Storage from '@google-cloud/storage';

      const gcs = Storage();
      import {tmpdir} from 'os';
      import {join, dirname} from 'path';

      import * as sharp from 'sharp';
      import * as fs from 'fs-extra';


      export const generateThumbs = functions.storage
        .object()
        .onFinalize(async object => {
          const bucket = gcs.bucket(object.bucket);
          const filePath = object.name;
          const fileName = filePath.split('/').pop();
          const bucketDir = dirname(filePath);

          const workingDir = join(tmpdir(), 'thumbs');
          const tmpFilePath = join(workingDir, 'source.png');

          if (fileName.includes('thumb@') || !object.contentType.includes('image')){
            console.log('exiting function')
            return false;
          }

          // Ensure thumbnail exists
          await fs.ensureDir(workingDir);

          // Download Source file
          await bucket.file(filePath).download({
            destination: tmpFilePath
          });

          // Resize the images and define an array of upload promises
          const sizes = [64, 128, 256];
          const uploadPromises = sizes.map(async size => {
            const thumbName = `thumb@${size}_${fileName}`;
            const thumbPath = join(workingDir, thumbName);
            // Resize Source image
            await sharp (tmpFilePath)
              .resize(size, size)
              .toFile(thumbPath);
              // Upload to GCS
              return bucket.upload(thumbPath, {
                destination: join(bucketDir, thumbName)
              });
          });
          // Run the upload operations
          await Promise.all(uploadPromises);
          // Cleanup remove the tmp/thumbs from the filesystem
          return fs.remove(workingDir);
        });
        