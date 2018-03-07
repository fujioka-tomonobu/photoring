var values = new function(){};

/*
 * ロード処理
 */
$(function(){
	'use strict';
	
	//デバイス判定（タッチが有効か否か）
	var isTouchDevice = (('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch);
	//デバイス判定によるイベントの決定
	var eventType = (isTouchDevice) ? 'touchend' : 'click';
	
	values.eventType = eventType;
	values.reader = new FileReader();
	values.socket = io.connect();
	values.slideshowIntervalId;
	values.socketConnected = false;
	
	if(!window.File){
		alert('このブラウザではご利用になれません。');
		return;
	}
	
	// キーイベント
	$("body").keydown( function(e) {
		var keycode = e.which ? e.which : e.keyCode;
		if(keycode == 27){
			events.closeSlideShow(e);
		}
	});
	
	values.socket.on('connect', function(){
		values.socketConnected = true;
		$('#cameraBtn').show();
		$('#slideshowBtn').show();
	});
	values.socket.on('disconnect', function(){
		values.socketConnected = false;
		$('#cameraBtn').hide();
		$('#slideshowBtn').hide();
	});
	
	
	$(window).on('resize', function(e){
		$('#slidePhoto').css({
			'max-height' : $(window).height() + 'px',
			'max-width' : '100%'
		});
	});
	
	// スライドショー開始
	//$('#slideshowBtn').on('click', events.startSlideShow);
	// スライドショー終了
	$('#slideshowCloseBtn').on(values.eventType, events.closeSlideShow);
	
	
	
	// カメラアイコン選択時
	$('form').on('submit', function(e){
		
		e.preventDefault();
		
		if(values.socketConnected == false){
			alert('サーバとの接続が切断されているため、撮影できません。');
			return false;
		}
		
		// ファイル選択を押させる
		$('#imageFile').click();
		return false;
	});
	
	
	// Fileコントロールが変化したら（写真が撮影されたら）リーダに食わせる
	$('#imageFile').on('change', function(){
		if($(this).prop('files').length > 0) {
			values.reader.readAsDataURL($(this).prop('files')[0]);
		}
	});
	
	
	/*
	 * リーダが食った後に発火
	 */
	$(values.reader).on('load', function(event){
		
		if(values.reader.result.lastIndexOf('data:image', 0) !== 0){
			alert('画像データ以外を扱うことはできません。');
			return;
		}
		
		// 写真を回転させる
		events.rotateImage(values.reader.result, function(rotatedPhoto){
			
			var photoId = Date.now();
			
			// 画面に写真追加
			events.addPhoto(photoId, rotatedPhoto, 'prepend');
			
			// サーバに登録
			$.ajax(
				{
					type: 'POST',
					url: '/photos',
					contentType: 'application/json',
					data: JSON.stringify({photoId : photoId, photo : rotatedPhoto})
				}

			// 成功時
			).done(function(data, textStatus, jqXHR){
				
				// ソケットに送信
				values.socket.emit('photo_send', {photoId : photoId});

			// 失敗時
			}).fail(function(jqXHR, textStatus, errorThrown){
				console.log(jqXHR);
			});
		});
		
	});
	
	
	
	// 初期表示時の画像一覧取得
	$.ajax(
		{
			type: 'GET', cache : false, url: '/photos', dataType: 'json'
		}

	// 成功時
	).done(function(response, textStatus, jqXHR){
		
		if(response){
			
			// 取得した写真ID一覧を元に順番にGETしていく（一度に取ろうとすると重すぎた、、、）
			response.reverse().forEach(function(id){
				
				events.addPhoto(id, null, 'append')

				$.ajax(
					{
						type: 'GET', cache : true, url: '/photos/' + id, dataType: 'json'
					}
				// 成功時
				).done(function(response, textStatus, jqXHR){
					$('#' + id).prop('src', response.photo);
					$('#' + id).parent().prop('href', response.photo);
					
				// 失敗時
				}).fail(function(jqXHR, textStatus, errorThrown){
					console.log(jqXHR);
				});

			});
			
			
		}
		
	// 失敗時
	}).fail(function(jqXHR, textStatus, errorThrown){
		console.log(jqXHR);
	});
	
	
	
	
	// 写真がブロードキャストされたとき
	values.socket.on('photo_delivery', function(data){
		
		$.ajax(
			{
				type: 'GET', cache : false, url: '/photos/' + data.photoId, dataType: 'json'
			}
		// 成功時
		).done(function(response, textStatus, jqXHR){
			
			// 写真追加
			events.addPhoto(response.photoId, response.photo, 'prepend');
			
		// 失敗時
		}).fail(function(jqXHR, textStatus, errorThrown){
			console.log(jqXHR);
		});
		
	});
	
	
	
	// 写真の削除がブロードキャストされたとき
	values.socket.on('photo_remove_delivery', function(data){
		// 一覧から削除
		$('#' + data.photoId).parent().remove();
	});
	
	
	
});



/*
 * 画面イベント
 */
var events = new function(){
	'use strict';
	
	
	/**
	 * 写真をいい感じに回転させる
	 */
	this.rotateImage = function(imgB64_src, callback){
		
		// orientation
		var orientation = events.getOrientation(imgB64_src);
		
		// Image Type
		var img_type = imgB64_src.substring(5, imgB64_src.indexOf(";"));
		// Source Image
		var img = new Image();
		
		img.onload = function() {
			// New Canvas
			var canvas = document.createElement('canvas');
			
			// Draw (Resize)
			var ctx = canvas.getContext('2d');
			
			// 向きによって縦横を逆転
			if(orientation == 6 || orientation == 8) {
				canvas.width = img.height;
				canvas.height = img.width;
			} else {
				canvas.width = img.width;
				canvas.height = img.height;
			}
			
			// 回転軸をCanvasのど真ん中に持ってくる
			ctx.translate( canvas.width/2, canvas.height/2 ) ;
			
			switch(orientation){
				case 1 :
					break;
				case 3 :
					ctx.rotate(180 * Math.PI / 180);
					break;
				case 6 :
					ctx.rotate(90 * Math.PI / 180);
					break;
				case 8 :
					ctx.rotate(270 * Math.PI / 180);
					break;
			}
			
			// 画像書き込み！
			ctx.drawImage(img, -img.width/2, -img.height/2, img.width, img.height);
			
			// Destination Image
			var imgB64_dst = canvas.toDataURL(img_type);
			
			// コールバック
			callback(imgB64_dst);
			
		};
		
		img.src = imgB64_src;
	}
	
	
	/**
	 * 写真の追加
	 */
	this.addPhoto = function(id, photo, appendOrPrepend){
		var anc = $('<a>',
						{
							class : 'fancybox',
							href : photo,
							'data-fancybox' : 'group',
							style : 'display:none;',
							'data-options' : id
						}
				)
				.append(
					$('<img>',
						{
							id : (id ? id : ''),
							src : photo,
							class : 'smallimage'
						}
					).on('load', function(e){
						$(this).parent().fadeIn(200);
					})
				);
		
		// 追加する
		if(appendOrPrepend === 'append'){
			$('#photos').append(anc);
		} else if(appendOrPrepend === 'prepend'){
			$('#photos').prepend(anc);
		}
		
		$('a.fancybox').fancybox({
			animationEffect : "fade",
			transitionEffect : "slide",
			infobar : true,
			toolbar : true,
			arrows : true,
			buttons : [
				'slideShow',
				'thumbs',
				'download',
				'remove',
				'close'
			],
			btnTpl : {
				remove : 
					'<a class="fancybox-button" title="Remove photo" on' + values.eventType + '="events.removePhoto()">' +
						'<span style="vertical-align:middle;"><img src="/images/trash.png"></span>' +
					'</a>',

				slideShow : 
					'<button class="fancybox-button fancybox-button--play" title="Start slideshow" on' + values.eventType + '="events.startSlideShow()">' + 
						'<svg viewBox="0 0 40 40"><path d="M13,12 L27,20 L13,27 Z"></path><path d="M15,10 v19 M23,10 v19"></path></svg>' + 
					'</button>'
			}
		});
		
		
	};
	
	
	/**
	 * 写真の削除処理
	 */
	this.removePhoto = function(){
		
		$("#dialog-confirm").dialog({
			resizable: false,
			height: "auto",
			width: '80%',
			modal: true,
			dialogClass: 'noTitleDialog',
			buttons: {
				"Delete": function() {
					
					var instance = $.fancybox.getInstance();
					var photoId = instance.current.opts.options;
					
					// ソケットに送信
					values.socket.emit('photo_remove_send', {photoId : photoId});
					
					$.fancybox.close();
					
					// 一覧から削除
					$('#' + photoId).parent().remove();
		
					$( this ).dialog( "close" );
				},
				Cancel: function() {
					$( this ).dialog( "close" );
				}
			}
		});
		
	};
	
	
	
	/**
	 * jpegの向き取得
	 */
	this.getOrientation = function(imgDataURL){
		
		var byteString = atob(imgDataURL.split(',')[1]);
		var head = 0;
		var orientation;
		
		while (1){
			if (byteString.charCodeAt(head) == 255 & byteString.charCodeAt(head + 1) == 218) {
				break;
			}
			
			if (byteString.charCodeAt(head) == 255 & byteString.charCodeAt(head + 1) == 216) {
				head += 2;
			} else {
				var length = byteString.charCodeAt(head + 2) * 256 + byteString.charCodeAt(head + 3);
				var endPoint = head + length + 2;
				if (byteString.charCodeAt(head) == 255 & byteString.charCodeAt(head + 1) == 225) {
					var segment = byteString.slice(head, endPoint);
					var bigEndian = segment.charCodeAt(10) == 77;
					var count;
					if (bigEndian) {
						count = segment.charCodeAt(18) * 256 + segment.charCodeAt(19);
					} else {
						count = segment.charCodeAt(18) + segment.charCodeAt(19) * 256;
					}
					for (var i=0; i < count; i++){
						var field = segment.slice(20 + 12 * i, 32 + 12 * i);
						if ((bigEndian && field.charCodeAt(1) == 18) || (!bigEndian && field.charCodeAt(0) == 18)) {
							orientation = bigEndian ? field.charCodeAt(9) : field.charCodeAt(8);
						}
					}
					break;
				}
				head = endPoint;
			}
			
			if (head > byteString.length){
				break;
			}
		}
		if(!orientation){
			return 1;
		}
		
		return orientation;
		
	};
	
	
	/**
	 * スライドショー開始
	 */
	this.startSlideShow = function(e){
		
		var instance = $.fancybox.getInstance();
		var currentPhotoId = instance.current.opts.options;
		var nextPhotoIndex = 0;
		
		$.fancybox.close();
		
		$('#slideshow').fadeIn(400);
		
		var zoomTime = 1000;
		var slideTime = 7000;
		
		var isZoomIn = false;
		$('#slidePhoto').on('load', function(){
			
			$(this)
				.fadeIn(zoomTime)
				.removeClass('zoomIn');
			
			if(!isZoomIn){
				$(this).addClass('zoomIn');
			}
			
			isZoomIn = !isZoomIn;
		});
		
		// 写真は削除される可能性あるので面倒くさいことをする
		var photos = $('.smallimage');
		photos.each(function(idx, target){
			if(target.id == currentPhotoId){
				nextPhotoIndex = idx;
				return false;
			}
		});
		
		if(nextPhotoIndex >= photos.length){
			nextPhotoIndex = 0;
		}
		
		// 表示
		var img = $('.smallimage').eq(nextPhotoIndex).prop('src');
		$('#slidePhoto')
			.prop('src', img)
			.css({
					'transition' : 'transform ' + (zoomTime + slideTime)/1000 + 's linear',
					'max-height' : ($(window).height()) + 'px',
					'max-width'  : '100%'
			});
				
		// ４秒ごとに切替
		values.slideshowIntervalId = setInterval(function(){
			
			$('#slidePhoto').fadeOut(zoomTime, function(){
				var photos = $('.smallimage');
				
				// 次の表示対象を探す
				photos.each(function(idx, target){
					if(target.id == currentPhotoId){
						nextPhotoIndex = idx + 1;
						return false;
					}
				});
				
				if(nextPhotoIndex >= photos.length){
					nextPhotoIndex = 0;
				}
				
				currentPhotoId = photos.eq(nextPhotoIndex).prop('id');
				
				// 写真切り替え
				var img = photos.eq(nextPhotoIndex).prop('src');
				$('#slidePhoto').prop('src', img);
			});
		
		}, slideTime + zoomTime);
	};
	
	
	/**
	 * スライドショー終了
	 */
	this.closeSlideShow = function(e){
		if(values.slideshowIntervalId){
			clearInterval(values.slideshowIntervalId);
			values.slideshowIntervalId = null;
			$('#slideshow').fadeOut(400);
			$('#slidePhoto').removeClass('zoomIn').fadeOut(400);
		}
	};

};
