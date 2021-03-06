var request = require('request');

var authUrl = "https://www.dropbox.com/oauth2/authorize?";
var apiRoot = "https://api.dropbox.com/2/";
var apiContentRoot = "https://api-content.dropbox.com/2/";
var apiLongPoll = "https://notify.dropboxapi.com/2/files/list_folder/longpoll";
var api = {
  auth: {
    disable_token: '/auth/token/revoke'
  },
  account: '/users/get_current_account',
  metadata: '/files/get_metadata',
  fileops: {
    createFolder: '/files/create_folder',
    remove: '/files/delete',
    copy: '/files/copy',
    move: '/files/move'
  },
  putFiles: '/files/upload',
  getFiles: '/files/download'
};

exports.Authenticate = function(ckey, csecret, redirect_uri, cb) {
  var err = "";
  var redirect_url = "";

  if(ckey === "" || csecret === "" || redirect_uri === "") {
    err = "Missing client key and/or client secret key.";
  }else{
    redirect_url = authUrl + "client_id=" + ckey + "&response_type=code&redirect_uri=" + redirect_uri;
  }

  cb(err, redirect_url);
}

exports.AccessToken = function(ckey, csecret, auth_code, redirect_url, cb) {
  var url = apiRoot + '/oauth2/token';
  var body = {
    "code": auth_code,
    "grant_type": "authorization_code",
    "redirect_uri": redirect_url,
    "client_id": ckey,
    "client_secret": csecret
  };

  request.post(url, {form: body, json: true}, function(err, res, body) {
    cb(err, body);
  });
}

exports.api = function(access_token) {

  var access_token = access_token;

  return {
    account: function(cb) {
      options = optionsBuilder(apiRoot + api.account, access_token);
      request.post(options, function(err, res, body) {
        cb(err, res, body);
      })
    },

    createDir: function(path, cb) {
      options = postBuilder(apiRoot + api.fileops.createFolder,
        {root:"", path:path}, access_token);
      request.post(options, function(err, res, body) {
        cb(err, res, body);
      })
    },

    removeDir: function(path, cb) {
      options = postBuilder(apiRoot + api.fileops.remove,
        {root:"", path:path}, access_token);
      request.post(options, function(err, res, body) {
        cb(err, res, body);
      });
    },

    moveSomething: function(from, to, cb) {
      options = postBuilder(apiRoot + api.fileops.move,
        {root:"", from_path:from, to_path:to}, access_token);
      request.post(options, function(err, res, body) {
        cb(err, res, body);
      });
    },

    createFile: function(path, body, cb) {
      options = {
        method: "POST",
        url: apiContentRoot + api.putFiles,
        headers: {
	  "Content-Type": "text/plain; charset=dropbox-cors-hack",
	  //"Content-Type": "application/octet-stream",
	  "Dropbox-API-Arg": '{"path": "/'+path+'","mode": "overwrite","autorename": false,"mute": false,"strict_conflict": false}',
          "Authorization": "Bearer "+ access_token
	},
        json: false,
        body: body.toString('utf8')
      }

      request(options, function(err, res, body) {
        cb(err, res, body);
      })
    },

    removeFile: function(path, cb) {
      options = postBuilder(apiRoot + api.fileops.remove,
        {root: "", path:path}, access_token);
      request.post(options, function(err, res, body) {
        cb(err, res, body);
      });
    },

    /**
     * get the metadata of a file or folder
     * the result body.contents can be used to list a folder's content
     */
    getMetadata: function(path, cb) {
      options = optionsBuilder(apiRoot + api.metadata + "/" + path, access_token);
      request.get(options, function(err, res, body) {
        cb(err, res, body);
      });
    },

    /**
     * Downloads a file.
     */
    getFile: function(path, cb) {
      options = {
        method: "GET",
		//Lets let the main app set that...
		encoding: null,
        url: apiContentRoot + api.getFiles,
        headers: {
         //"Content-Type": "image/png",
         //"Content-Type": "application/octet-stream",
         "Dropbox-API-Arg": '{"path": "/'+path+'"}',
         "Authorization": "Bearer "+ access_token
        }
	  }
      return request(options, cb);
    },

    /**
     * Gets changes to files and folders in a user's Dropbox.
     */
    getDelta: function(cursor, path, cb) {
      options = postBuilder(apiRoot + '/delta',
        {cursor:cursor, path_prefix:path}, access_token);
      request.post(options, function(err, res, body) {
        cb(err, res, body);
      })
    },

    /**
     * Gets notifications from server
     */
    getNotifications: function(cursor, timeout, cb) {
      var cursor = cursor || null,
        timeout = timeout || 480,
        url = apiLongPoll + '?cursor=' + cursor + '&timeout=' + timeout;

      request.get(url, function(err, res, body) {
        cb(err, res, body);
      });
    }
  }

}

function optionsBuilder(url, access_token) {
  return {
    url: url,
    json: true,
    headers: {
      "Authorization": "Bearer " + access_token
    }
  }
}

function postBuilder(url, data, access_token) {
  return {
    url: url,
    json: true,
    headers: {
      "Authorization": "Bearer " + access_token
    },
    form: data
  }
}

function getByteLength(normal_val) {
  // Force string type
  normal_val = String(normal_val);

  var byteLen = 0;
  for (var i = 0; i < normal_val.length; i++) {
    var c = normal_val.charCodeAt(i);
    byteLen += c < (1 <<  7) ? 1 :
               c < (1 << 11) ? 2 :
               c < (1 << 16) ? 3 :
               c < (1 << 21) ? 4 :
               c < (1 << 26) ? 5 :
               c < (1 << 31) ? 6 : Number.NaN;
  }
  return byteLen;
}

