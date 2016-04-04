var Console = function (prefs) {

  this.userId = prefs.userId;
  this.fileDir = prefs.fileDir;

  this.inputDiv = document.getElementById(prefs.inputDiv);
  this.consoleDiv = document.getElementById(prefs.consoleDiv);
  this.inputStarterDiv = document.getElementById(prefs.inputStarterDiv);

  this.workingDirPath = '';
  this.workingDirData = {};
  this.diskIterationStack = [];
  this.colCount = 4;

  this.cmdAutoTyperCharPtr = 0;
  this.cmdAutotyperTimer;

  this.inputStarterString = this.getInputStarterString();

  var that = this;

  $.ajax({
      type: "GET",
      url: this.fileDir,
      dataType: "json",
      success: function(data) {
        that.workingDirData = data;
      },
      error: function() {
        that.print("Failed to get file list from server.");
      }
  });

  this.inputStarterDiv.innerHTML = this.inputStarterString;
  this.inputDiv.focus();

  // http://stackoverflow.com/questions/1125292/how-to-move-cursor-to-end-of-contenteditable-entity
  document.documentElement.addEventListener("click", function(event) {
    that.inputDiv.focus();
    var range = document.createRange();
    range.selectNodeContents(that.inputDiv);
    range.collapse(false);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }, false);

  this.inputDiv.addEventListener("click", function (event) {
    event.stopPropagation
  }, false);

  var links = document.getElementsByClassName("link");
  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener("click", function (event) {
      event.stopPropagation
    }, false);
  }

  this.inputHandler = function (e) {
    var key = e.which || e.keyCode || 0;
    if(key == 13)
    {
      that.submitInput();
      return false;
    }
    return true;
  }

  this.inputDiv.addEventListener("keydown", this.inputHandler, false);
};

Console.prototype = {

  getInputStarterString: function () {
    return this.userId + '@vip:/web' + this.workingDirPath + '>  ';
  },

  makeInputDivVisible: function () {
    // add code to check if visible
    this.inputDiv.scrollIntoView();
  },

  setInputEnabled: function (state) {
    if(state)
    {
      this.inputDiv.setAttribute("contenteditable", "true");
      this.inputDiv.style.display = 'inline-block';
      this.inputStarterDiv.style.display = 'inline-block';
      this.makeInputDivVisible();
    }else{
      this.inputDiv.setAttribute("contenteditable", "false");
      this.inputDiv.style.display = 'none';
      this.inputStarterDiv.style.display = 'none';
    }
  },

  print: function (data) {
    this.consoleDiv.appendChild(document.createElement('br'));
    this.consoleDiv.appendChild(document.createTextNode(data + " "));
  },

  submitInput: function () {
    this.print(this.inputStarterString + this.inputDiv.textContent);

    var cmd = this.inputDiv.textContent.replace(/\s\s+/g, ' ').trim();
    this.inputDiv.innerHTML = "";

    this.makeInputDivVisible();
    this.runCommand(cmd);
    this.makeInputDivVisible();
  },

  getFile: function (name) {
    for(var i in this.workingDirData)
    {
      if(this.workingDirData[i].name == name && this.workingDirData[i].type == "file")
        return this.workingDirData[i];
    }
    return undefined;
  },

  getDir: function (name) {
    for(var i in this.workingDirData)
    {
      if(this.workingDirData[i].name == name && this.workingDirData[i].type == "dir")
        return this.workingDirData[i];
    }
    return undefined;
  },

  getFileContent: function (path, callback) {
    $.get(path , callback)
    .fail(function() {
      callback("File retrieval failed!");
    });
  },

  linkCommandToEvent: function (id, eve, cmd) {
    var that = this;
    document.getElementById(id).addEventListener(eve, function(e) {
      that.typeAndRunCmd(cmd);
    }, false);
  },

  runCommand: function (str) {
    if(/^\s*$/.test(str))
      return -2;

    var cmds = str.split(" ");

    this.setInputEnabled(false);

    switch (cmds[0]) {
      case "clear":
        return this.cmd_clear(cmds);
      case "cat":
        return this.cmd_cat(cmds);
      case "ls":
        return this.cmd_ls(cmds);
      case "cd":
        return this.cmd_cd(cmds);
      case "man":
        return this.cmd_man(cmds);
      case "pwd":
        return this.cmd_pwd(cmds);
      case "who":
        return this.cmd_who(cmds);
      case "date":
        return this.cmd_date(cmds);
      case "mkdir":
      case "rm":
      case "cp":
      case "ln":
      case "mv":
      case "touch":
      case "chmod":
      case "mount":
      case "unmount":
      case "sudo":
      case "chroot":
      case "su":
      case "kill":
        this.print(cmds[0] + ": permission denied");
        // return cmd_permission_err();
        break;
      default:
        this.print(cmds[0] + ": command not found");
    }

    this.setInputEnabled(true);
    return 0;
  },

  getFileCommandRunner: function (file)
  {
    var cmd;
    switch(file.type)
    {
      case "dir":
        cmd = "cd " + file.name;
        break;
      case "file":
        cmd = "cat " + file.name;
        break;
    }
    var that = this;
    return function(){
      that.typeAndRunCmd(cmd);
    }
  },

  typeAndRunCmdHelper: function (str) {
      var humanize = Math.round(Math.random() * (85 - 30)) + 30;
      var that = this;
      this.cmdAutotyperTimer = setTimeout(function() {
          that.cmdAutoTyperCharPtr++;
          that.inputDiv.blur();
          that.inputDiv.innerHTML = str.substring(0, that.cmdAutoTyperCharPtr) + '|';
          that.typeAndRunCmdHelper(str);

          if (that.cmdAutoTyperCharPtr == str.length) {
              that.inputDiv.innerHTML = that.inputDiv.innerHTML.slice(0, -1);
              clearTimeout(that.cmdAutotyperTimer);
              that.inputDiv.focus();
              that.submitInput();
          }

      }, humanize);
  },

  typeAndRunCmd: function (str) {
    this.cmdAutoTyperCharPtr = 0;
    clearTimeout(this.cmdAutotyperTimer);
    this.typeAndRunCmdHelper(str);
  },

  ////////////////////////////////////////
  //       Command implementations      //
  ////////////////////////////////////////

  // clear command implementation
  cmd_clear: function(cmds){
    this.consoleDiv.innerHTML = "&nbsp;";
    this.setInputEnabled(true);
    return 0;
  },

  // cat command implementation
  cmd_cat: function(cmds){
    // Not enough parameters
    if(cmds.length < 2)
    {
      this.print(cmds[0] + ": missing file path");
      this.setInputEnabled(true);
      return -1;
    }

    // Check if file exists
    var file = this.getFile(cmds[1]);

    var that = this;

    if(file){
      // Get file data via ajax and print data to console
      this.getFileContent(file.download_url,
        function(data){
            that.print("");
            var span = document.createElement("span");
            span.setAttribute("class", "cmd-output");
            span.appendChild(document.createTextNode(data));
            that.consoleDiv.appendChild(span);
            that.setInputEnabled(true);
        });
    } else {
      // Print out error
      this.print(cmds[0] + ": " + cmds[1] + ": No such file or directory");
      this.setInputEnabled(true);
      return -1;
    }

    return 0;
  },

  // ls command implementation
  cmd_ls: function(cmds){
    /*
    var list = "";
    for(i in workingDirData)
    {
      list += workingDirData[i].name + '<br>';
    }
    var newNode = document.createElement('div');
    newNode.className = 'console-list';
    newNode.innerHTML = list.slice(0, list.length - 4);
    consoleDiv.appendChild(newNode);
    */

    // Using columns would be ideal, but can't due to chrome bug
    var perCol = Math.ceil(this.workingDirData.length/this.colCount);
    var ptr = 0;

    var table = document.createElement('table');
    var tr = document.createElement('tr');
    for(var i = 0; i < this.colCount; i++)
    {
      var td = document.createElement('td');
      for(var j = 0; j < perCol && ptr < this.workingDirData.length; j++)
      {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(this.workingDirData[ptr].name));
        div.setAttribute("class", "console-link");
        div.addEventListener("click", this.getFileCommandRunner(this.workingDirData[ptr]), false);
        td.appendChild(div);
        ptr++;
      }
      tr.appendChild(td);
    }
    table.appendChild(tr);

    this.print("");
    this.consoleDiv.appendChild(table);
    this.setInputEnabled(true);
    return 0;
  },

  // cd implementation
  cmd_cd: function(cmds){
    // Not enough parameters
    if(cmds.length < 2)
    {
      this.print(cmds[0] + ": missing file path");
      this.setInputEnabled(true);
      return -1;
    }

    switch(cmds[1])
    {
        case ".":
          break;
        case "..":
          if(this.diskIterationStack.length == 0)
            break;
          var oldData = this.diskIterationStack.pop();
          this.workingDirPath = oldData.wd_path;
          this.workingDirData = oldData.wd_data;
          break;
        default:
          // Check if directory exists
          var file = this.getDir(cmds[1]);
          var that = this;

          if(file){
            // Move to directory
            $.ajax({
                type: "GET",
                url: file.url,
                dataType: "json",
                success: function(result) {
                  that.diskIterationStack.push({'wd_path': that.workingDirPath, 'wd_data': that.workingDirData});
                  that.workingDirPath += "/" + cmds[1];
                  that.workingDirData = result;
                  that.inputStarterString = that.getInputStarterString();
                  that.inputStarterDiv.innerHTML = that.inputStarterString;
                },
                error: function() {
                  that.print("Failed to get file list from server.");
                }
            })
            .always(function() {
              that.setInputEnabled(true);
            });
            return 0;
          } else {
            // Print out error
            this.print(cmds[0] + ": " + cmds[1] + ": No such directory");
            this.setInputEnabled(true);
            return -1;
          }
    }

    this.inputStarterString = this.getInputStarterString();
    this.inputStarterDiv.innerHTML = this.inputStarterString;
    this.setInputEnabled(true);

    return 0;
  }
}