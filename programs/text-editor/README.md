# text-editor

Text Editor for university project

In order to run this text editor, you must first open a terminal at directory, and enter:

> npm install

This will install all packages.
Note - there have been problems with some devices having the wrong version of Node installed for the
version of node-gyp they have. Therefore if this step doesn't work, you can try on a MacOS device, or
remove the node-pty dependency from package.json and comment it out the include of node-pty from the
main.js. This will cause the terminal to lose its functionality, however the rest of the editor will
work.

Once the node_modules folder is installed, run:

> npm run rebuild

This builds the modules to a Node version suitable for Electron

Once the rebuild is complete, you can either run:

> npm run package

To package the application. This will create an executable that you can open.

OR

run:

> npm run start

Which will build the application and run it for you.

To find this project on GitHub, go to https://github.com/wako104/text-editor
