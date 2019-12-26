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


	this.canvas = options.canvas || null;
	this.audioContext = null;//进行音频处理的上下文，稍后会进行初始化
	this.source = null; //保存音频
	this.analyser = null;
	this.cancelAnimationFrame = null;//requestAnimationFrame

	// 监听，获取音乐总时间
	this.el.addEventListener("loadeddata", function () {
		_this.duration = _this.el.duration;
		_this.formatDuration = _this.format(_this.el.duration)
	})
	// _this.el.addEventListener("progress", function () { })
	//监听播放时间改变，会立即执行一次  
	this.el.addEventListener("timeupdate", function () {
		// console.log("timeupdate");
		_this.currentTime = _this.el.currentTime;
		_this.formatCurrentTime = _this.format(_this.el.currentTime)
		_this.render()
	})


}

audiojs.prototype = {
	// 设置播放
	play: function (index) {
		if (typeof index == "number" && this.list[index]) {
			this.playIndex = index;
			this.el.src = this.list[this.playIndex];
		}
		console.log(this, this.el);

		if (this.el.src && window.location.href.indexOf(this.el.src) != 0) {//src=""时，指向网页
			this.el.play()
		} else if (this.list.length > 0) {
			this.el.src = this.list[0];
			this.el.play()
		} else {
			console.log("没有指定资源");
			return
		}
		if (this.audioContext) {
			// 播放
			this.audioContext.resume().then(() => {
				// this._drawSpectrum();//开始动画
				console.log('Playback resumed successfully');
			});
		}
	},
	// 设置暂停
	pause: function (arr) {
		this.el.pause();
		// if (this.audioContext) { 

		// }
	},
	// 设置播放时间
	setCurrentTime: function (time) {
		this.el.currentTime = time || 0
	},
	// 格式化时间函数
	format: function (time) {
		var Minute = parseInt(time / 60);
		var Second = parseInt(time % 60);

		return Minute + ":" + Second
	},
	// 播放下一首
	playNext: function () {
		if (this.loop == 'once') {

		} else if (this.loop == 'loop') {
			if (this.playIndex < this.list.length - 1) {
				this.playIndex++;
				this.play(this.playIndex)
			} else {
				this.playIndex = 0;
				this.play(this.playIndex)
			}
		} else if (this.loop == 'order') {
			if (this.playIndex < this.list.length - 1) {
				this.playIndex++;
				this.play(this.playIndex)
			}
		}
	},
	render: function () {
		var progress = this.currentTime / this.duration * 100 || 0;

		if (progress == 100) {//播放完成
			this.playNext();
		}
		// console.log(this.duration, progress);
		this.callback({
			progress: progress,//百分比进度值，播放完成=100
			duration: this.duration,//总时间（秒）
			currentTime: this.currentTime,//当前播放时间（秒）

			formatDuration: this.formatDuration,//总时间（字符串，分）,自定义的话可以更改format函数
			formatCurrentTime: this.formatCurrentTime,//当前播放时间（字符串，分）,自定义的话可以更改format函数

			paused: this.el.paused,//是否暂停
		})
	},


	_initAudioContext: function (canvas) {
		try {
			window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;
			window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame;
			if (!AudioContext) {
				console.log("浏览器不支持");
				return
			}
			if (canvas) this.canvas = canvas;

			this.audioContext = new AudioContext();

			console.log(this.audioContext)
			this.source = this.audioContext.createMediaElementSource(this.el);
			this.analyser = this.audioContext.createAnalyser();

			//将source与分析器连接
			this.source.connect(this.analyser);

			//将分析器与destination连接，这样才能形成到达扬声器的通路
			this.analyser.connect(this.audioContext.destination);

			//音乐响起后，把analyser传递到另一个方法开始绘制频谱图了，因为绘图需要的信息要从analyser里面获取
			this._drawSpectrum();
		} catch (e) {
			console.log('初始化AudioContext失败', e);
		}
	},
	_drawSpectrum: function () {
		if (!this.canvas) {
			console.error("调用_initAudioContext(canvas)时需要传入canvas对象");
			return
		}
		console.log(this.analyser);
		var _this = this;
		var cwidth = this.canvas.width;
		var cheight = this.canvas.height - 2;
		var meterWidth = 10; //频谱条宽度
		var gap = 2; //频谱条间距
		var capHeight = 2;
		var capStyle = '#fff';
		var meterNum = 800 / (10 + 2); //频谱条数量,计算当前画布上能画多少条
		var capYPositionArray = []; //将上一画面各帽头的位置保存到这个数组

		var ctx = this.canvas.getContext('2d');
		var gradient = ctx.createLinearGradient(0, 0, 0, 300);

		gradient.addColorStop(1, '#0f0');
		gradient.addColorStop(0.8, '#ff0');
		gradient.addColorStop(0, '#f00');

		// 此函数在初始化_initAudioContext后一直运行
		function drawMeter() {
			var array = new Uint8Array(_this.analyser.frequencyBinCount);// Uint8Array 的长度应该和 frequencyBinCount 相等
			_this.analyser.getByteFrequencyData(array);//将当前频率数据复制到传入的Uint8Array（无符号字节数组）中。

			var step = Math.round(array.length / meterNum); //计算采样步长
			ctx.clearRect(0, 0, cwidth, cheight);
			for (var i = 0; i < meterNum; i++) {
				var value = array[i * step]; //获取当前能量值
				if (capYPositionArray.length < Math.round(meterNum)) {
					capYPositionArray.push(value); //初始化保存帽头位置的数组，将第一个画面的数据压入其中
				};
				ctx.fillStyle = capStyle;
				//开始绘制帽头
				if (value < capYPositionArray[i]) { //如果当前值小于之前值
					ctx.fillRect(i * 12, cheight - (--capYPositionArray[i]), meterWidth, capHeight); //则使用前一次保存的值来绘制帽头
				} else {
					ctx.fillRect(i * 12, cheight - value, meterWidth, capHeight); //否则使用当前值直接绘制
					capYPositionArray[i] = value;
				};
				//开始绘制频谱条
				ctx.fillStyle = gradient;
				ctx.fillRect(i * 12, cheight - value + capHeight, meterWidth, cheight);
			}
			_this.cancelAnimationFrame = requestAnimationFrame(drawMeter);
		}
		requestAnimationFrame(drawMeter);
	}
}