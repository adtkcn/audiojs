function audiojs(options) {
	var _this = this;
	if (options.el) {
		this.el = options.el
	} else {
		this.el = document.createElement("audio");
		document.body.appendChild(this.el);
	}
	this.el.autoplay = false;//
	this.el.preload = "load";//
	this.el.loop = false;//禁用自带循环


	this.duration = 0;//总时间
	this.currentTime = 0;//播放时间


	this.formatDuration = "0:00";
	this.formatCurrentTime = "0:00";

	this.playIndex = options.playIndex || 0;//播放列表中第几首，从0开始
	// 设置音乐列表
	this.list = options.list instanceof Array ? options.list : [];


	this.loop = options.loop || "order";//order:顺序播放,once:仅播放一首，loop:循环列表,

	this.callback = options.callback instanceof Function ? options.callback : function (obj) { };

	// 设置播放
	this.play = function (index) {
		if (typeof index == "number" && _this.list[index]) {
			_this.playIndex = index;
			_this.el.src = _this.list[_this.playIndex];
		}
		if (_this.el.src && window.location.href.indexOf(_this.el.src) != 0) {//src=""时，指向网页
			_this.el.play()
		} else if (_this.list.length > 0) {
			_this.el.src = _this.list[0];
			_this.el.play()
		} else {
			console.log("没有指定资源");
		}
	}
	// 设置暂停
	this.pause = function (arr) { _this.el.pause() }
	// 设置播放时间
	this.setCurrentTime = function (time) {
		_this.el.currentTime = time || 0
	}
	// 格式化时间函数
	this.format = function (time) {
		var Minute = parseInt(time / 60);
		var Second = parseInt(time % 60);

		return Minute + ":" + Second
	}
	// 播放下一首
	this.playNext = function () {
		if (this.loop == 'once') {

		} else if (this.loop == 'loop') {
			if (_this.playIndex < _this.list.length - 1) {
				_this.playIndex++;
				_this.play(_this.playIndex)
			} else {
				_this.playIndex = 0;
				_this.play(_this.playIndex)
			}
		} else if (this.loop == 'order') {
			if (_this.playIndex < _this.list.length - 1) {
				_this.playIndex++;
				_this.play(_this.playIndex)
			}
		}
	}
	// 监听，获取音乐总时间
	_this.el.addEventListener("loadeddata", function () {
		_this.duration = _this.el.duration;
		_this.formatDuration = _this.format(_this.el.duration)
	})
	// _this.el.addEventListener("progress", function () { })
	//监听播放时间改变，会立即执行一次  
	_this.el.addEventListener("timeupdate", function () {
		// console.log("timeupdate");

		_this.currentTime = _this.el.currentTime;
		_this.formatCurrentTime = _this.format(_this.el.currentTime)
		_this.render()
	})



	this.render = function () {
		var progress = _this.currentTime / _this.duration * 100 || 0;


		if (progress == 100) {//播放完成
			this.playNext();
		}

		// console.log(_this.duration, progress);


		_this.callback({
			progress: progress,//百分比进度值，播放完成=100
			duration: _this.duration,//总时间（秒）
			currentTime: _this.currentTime,//当前播放时间（秒）

			formatDuration: _this.formatDuration,//总时间（字符串，分）,自定义的话可以更改format函数
			formatCurrentTime: _this.formatCurrentTime,//当前播放时间（字符串，分）,自定义的话可以更改format函数

			paused: _this.el.paused,//是否暂停
		})
	}


}

