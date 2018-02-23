var values = new function(){};

/*
 * ロード処理
 */
$(function(){
	'use strict';
	
	values.reader = new FileReader();
	values.socket = io.connect();
	values.currentPhotoId;
	
	
	if (!window.File){
		result.innerHTML = "File API 使用不可";
		return;
	}
	
	
	// 写真がブロードキャストされたとき
	values.socket.on('photo_delivery', function(data){
		// 写真追加
		events.addPhoto(data.photoId, data.photo, 'prepend');
	});
	
	// 写真の削除がブロードキャストされたとき
	values.socket.on('photo_remove_delivery', function(data){
		// 一覧から削除
		$('#' + data.photoId).parent().remove();
	});
	
	
	// アイコン選択時
	$('form').on('submit', function(e){
		e.preventDefault();
		// ファイル選択を押させる
		$('#imageFile').click();
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
			alert('画像じゃないよ！！');
			return;
		}
		
		// 写真を回転させる
		events.rotateImage(values.reader.result, function(rotatedPhoto){
			
			var photoId = Date.now();
			
			// 画面に写真追加
			events.addPhoto(photoId, rotatedPhoto, 'prepend');
			
			// ソケットに送信
			values.socket.emit('photo_send', {photoId : photoId, photo : rotatedPhoto});
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
						type: 'GET', cache : false, url: '/photos/' + id, dataType: 'json'
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
							'data-fancybox-group' : 'photoGroup',
							style : 'display:none;',
							title : 'この写真を削除する'
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
						$(this).parent().fadeIn(500);
					})
				);
		
		if(appendOrPrepend === 'append'){
			$('#photos').append(anc);
		} else if(appendOrPrepend === 'prepend'){
			$('#photos').prepend(anc);
		}
		
		// 選択されたとき、その写真IDを覚えておく（後で削除させるから）
		anc.on('click', function(e){
			values.currentPhotoId = $(this).find('img').prop('id');
		});
		
		$('a.fancybox').fancybox({
			'openEffect' : 'elastic',
			'closeEffect' : 'elastic',
			'afterShow' : function(e) {
				// 写真の削除処理
				$('.fancybox-title').on('click', events.removePhoto);
			}
		});

	};
	
	
	/**
	 * 写真の削除処理
	 */
	this.removePhoto = function(){
		
		// ソケットに送信
		values.socket.emit('photo_remove_send', {photoId : values.currentPhotoId});
		
		$.fancybox.close();
		
		// 一覧から削除
		$('#' + values.currentPhotoId).parent().remove();
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
};
