#Transfer4me

##URL
https://www.transfer4.me

##About
Transfer4me is an attempt to implement a peer-to-peer file sharing network through the web application. I have done this by creating a web application that uses WebRTC to establish a connection between two browsers. This prevents the need for a user to upload the file to a third party server to share it and thus prevents the security and privacy concerns that come with using them.

##How to use

The prototype web application is extremely simple to use.

####Uploading

The uploader loads the page, upload a file & password protect it if they wish. (please note: the prototype can't currently handle large files due to limitations of the browser.) The application will respond by giving you a URL to share with people and multiple methods to share it (facebook, twitter, google).

#####Downloading & Streaming

The recipient of the URL then load the page, triggering a password box to appear if the uploader passworded the room. After entering the password, they are redirected to a page where they can either download or, if it is a media file, stream it.
