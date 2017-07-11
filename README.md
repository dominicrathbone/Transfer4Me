# Transfer4me

## [LIVE APPLICATION DEMO](https://www.transfer4.me) (now down)

## About
Transfer4me is an attempt to implement a peer-to-peer file sharing network through the web application. I have done this by creating a web application that uses WebRTC to establish a connection between two browsers. This prevents the need for a user to upload the file to a third party server to share it and thus prevents the security and privacy concerns that come with using them.

## Installation
1. Download the application
The application can be downloaded either by installing Git or by clicking "Download Zip" at the top of this page.
If you choose you install git, you can get the application by cloning the repository to a directory of your choice:
`git clone https://github.com/domr115/CI301-Final-Year-Project.git`

2. Install node.js
To run the application, you must install node.js. The setup can be downloaded from [here](https://nodejs.org/en/)
After doing so, open the command line and navigate to the directory you have cloned or downloaded the application to.
Once you are at the base of the directory, navigate to Transfer4me/ and run `node server.js` which will start the application on port 80.

## How to use
The prototype web application is extremely simple to use.

#### Uploading
The uploader loads the page, upload a file & password protect it if they wish. (please note: the prototype can't currently handle large files due to limitations of the browser.) The application will respond by giving you a URL to share with people and multiple methods to share it (facebook, twitter, google).

#### Downloading & Streaming
The recipient of the URL then load the page, triggering a password box to appear if the uploader passworded the room. After entering the password, they are redirected to a page where they can either download or, if it is a media file, stream it.
