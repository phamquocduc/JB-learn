# -*- coding: utf-8 -*-
"""
Detailed Keigo (Kính ngữ) dataset for Shinkanzen Master N3 - Ngữ pháp (Bài 12).
Contains 29 detailed cards:
1. Tôn kính ngữ đặc biệt (9 cards)
2. Khiêm nhường ngữ đặc biệt (11 cards)
3. Cấu trúc và dạng thức kính ngữ quy tắc (9 cards)
"""

KEIGO_N3_DETAILED_RECORDS = [
    # --- 1. TÔN KÍNH NGỮ ĐẶC BIỆT (尊敬語) ---
    (
        "Bài 12 - Kính ngữ",
        "いらっしゃる / いらっしゃいます",
        "Đi / Đến / Ở (Kính cẩn)",
        "Động từ tôn kính đặc biệt của: 行く・来る・いる\nThể te: いらっしゃって",
        "Dùng để tôn vinh hành động đi, đến hoặc sự hiện diện của người bề trên, đối tác, khách hàng.",
        "先生は今、研究室にいらっしゃいます。 — Thầy giáo hiện đang ở trong phòng nghiên cứu.\n"
        "社長はどちらへいらっしゃいましたか。 — Giám đốc đã đi đâu rồi ạ?\n"
        "お客様がもういらっしゃいました。 — Khách hàng đã đến nơi rồi ạ.",
        "Shinkanzen Master N3 - Kính ngữ đặc biệt",
    ),
    (
        "Bài 12 - Kính ngữ",
        "おっしゃる / おっしゃいます",
        "Nói (Kính cẩn)",
        "Động từ tôn kính đặc biệt của: 言う（いう）\nThể te: おっしゃって",
        "Dùng khi người bề trên, cấp trên hoặc khách hàng phát ngôn, nói điều gì đó.",
        "先生がそのようにおっしゃいました。 — Thầy giáo đã nói như thế ạ.\n"
        "部長は何とおっしゃっていましたか。 — Trưởng phòng đã nói những gì vậy ạ?",
        "Shinkanzen Master N3 - Kính ngữ đặc biệt",
    ),
    (
        "Bài 12 - Kính ngữ",
        "なさる / なさいます",
        "Làm (Kính cẩn)",
        "Động từ tôn kính đặc biệt của: する\nThể te: なさって / Thể mệnh lệnh: なさい・なさってください",
        "Dùng để chỉ hành động của người bề trên đang làm một việc gì đó (hoặc đi cùng danh từ: ご旅行なさる...).",
        "週末は何をなさいますか。 — Cuối tuần ngài sẽ làm gì ạ?\n"
        "どうぞご無理なさらないでください。 — Xin ngài đừng làm việc quá sức ạ.",
        "Shinkanzen Master N3 - Kính ngữ đặc biệt",
    ),
    (
        "Bài 12 - Kính ngữ",
        "ご覧になる（ごらんになる）",
        "Xem / Nhìn (Kính cẩn)",
        "Động từ tôn kính đặc biệt của: 見る（みる）\nThể te: ご覧になって / Thể nhờ vả: ご覧ください",
        "Dùng khi người bề trên xem tranh ảnh, tài liệu, tivi hoặc quan sát sự việc.",
        "新しいパンフレットをご覧になりましたか。 — Bác đã xem tờ rơi quảng cáo mới chưa ạ?\n"
        "こちらの写真をご覧ください。 — Xin mời quý khách xem bức ảnh này ạ.",
        "Shinkanzen Master N3 - Kính ngữ đặc biệt",
    ),
    (
        "Bài 12 - Kính ngữ",
        "召し上がる（めしあがる）",
        "Ăn / Uống (Kính cẩn)",
        "Động từ tôn kính đặc biệt của: 食べる（たべる）・飲む（のむ）\nThể te: 召し上がって",
        "Dùng để mời hoặc nói về việc ăn uống của người bề trên, khách hàng.",
        "どうぞ温かいうちにお召し上がりください。 — Xin mời bác dùng bữa khi món ăn còn đang nóng ạ.\n"
        "お酒は召し上がりますか。 — Bác có uống được rượu không ạ?",
        "Shinkanzen Master N3 - Kính ngữ đặc biệt",
    ),
    (
        "Bài 12 - Kính ngữ",
        "ご存知だ（ごぞんじだ） / ご存知です",
        "Biết (Kính cẩn)",
        "Dạng tôn kính của: 知っている（しっている）\nPhủ định: ご存知ではありません / ご存知ない",
        "Dùng khi hỏi hoặc đề cập đến việc người bề trên có biết một thông tin, nhân vật nào đó hay không.",
        "田中先生のお電話番号をご存知ですか。 — Anh/chị có biết số điện thoại của thầy Tanaka không ạ?\n"
        "そのニュースはすでにご存知でしたか。 — Bác đã biết tin tức đó từ trước rồi đúng không ạ?",
        "Shinkanzen Master N3 - Kính ngữ đặc biệt",
    ),
    (
        "Bài 12 - Kính ngữ",
        "お召しになる（おめしになる）",
        "Mặc (Kính cẩn)",
        "Động từ tôn kính đặc biệt của: 着る（きる）・履く（はく）・かぶる",
        "Dùng để tôn kính việc bề trên mặc áo quần, áo khoác, đội mũ hoặc đi giày dép.",
        "素敵なコートをお召しになっていますね。 — Bác đang mặc một chiếc áo khoác rất đẹp ạ.\n"
        "どちらのお着物をお召しになりますか。 — Quý cô sẽ mặc bộ Kimono nào ạ?",
        "Shinkanzen Master N3 - Kính ngữ đặc biệt",
    ),
    (
        "Bài 12 - Kính ngữ",
        "くださる / くださいます",
        "Cho / Tặng (Kính cẩn)",
        "Động từ tôn kính đặc biệt của: くれる\nThể te: くださって / Đi cùng V-te: ～てくださいました",
        "Người bề trên ban tặng cho mình (hoặc người nhà mình) một món đồ hoặc làm giúp mình một việc gì.",
        "先生が貴重な本を貸してくださいました。 — Thầy giáo đã cho em mượn cuốn sách quý này ạ.\n"
        "部長がお土産をくださいました。 — Trưởng phòng đã tặng quà lưu niệm cho em ạ.",
        "Shinkanzen Master N3 - Kính ngữ đặc biệt",
    ),
    (
        "Bài 12 - Kính ngữ",
        "お亡くなりになる（おなくなりになる）",
        "Qua đời / Mất (Kính cẩn)",
        "Động từ tôn kính của: 死ぬ（しぬ）",
        "Cách nói trang trọng, tránh dùng từ trực tiếp '死ぬ' khi đề cập đến việc người bề trên hoặc người thân của họ qua đời.",
        "先月、田中先生のお父様がお亡くなりになりました。 — Tháng trước, thân phụ của thầy Tanaka đã qua đời ạ.",
        "Shinkanzen Master N3 - Kính ngữ đặc biệt",
    ),

    # --- 2. KHIÊM NHƯỜNG NGỮ ĐẶC BIỆT (謙譲語) ---
    (
        "Bài 12 - Kính ngữ",
        "参る（まいる） / 参ります",
        "Đi / Đến (Khiêm nhường)",
        "Động từ khiêm nhường đặc biệt của: 行く・来る",
        "Dùng khi bản thân (hoặc người phía mình) đi đâu đó hoặc đến nơi của đối phương / bề trên.",
        "明日、午前10時に御社へ参ります。 — Ngày mai vào lúc 10 giờ sáng tôi xin phép đến quý công ty ạ.\n"
        "ただいま、東京から参りました。 — Tôi vừa từ Tokyo đến nơi đây ạ.",
        "Shinkanzen Master N3 - Khiêm nhường ngữ đặc biệt",
    ),
    (
        "Bài 12 - Kính ngữ",
        "おる / おります",
        "Ở / Có (Khiêm nhường)",
        "Động từ khiêm nhường đặc biệt của: いる\nĐi cùng V-te: ～ております（đang làm gì）",
        "Dùng để nói về sự hiện diện hoặc hành động đang diễn ra của bản thân hoặc người phe mình.",
        "父は今、庭におります。 — Bố tôi hiện đang ở ngoài sân vườn ạ.\n"
        "私は日本語学校で勉強しております。 — Tôi hiện đang theo học tại trường Nhật ngữ ạ.",
        "Shinkanzen Master N3 - Khiêm nhường ngữ đặc biệt",
    ),
    (
        "Bài 12 - Kính ngữ",
        "申す（もうす） / 申し上げる（もうしあげる）",
        "Nói / Tên là (Khiêm nhường)",
        "Động từ khiêm nhường đặc biệt của: 言う（いう）",
        "Dùng khi giới thiệu họ tên bản thân hoặc phát biểu ý kiến lên bề trên / đối tác.",
        "私、ベトナムから参りましたナムと申します。 — Tôi tên là Nam, đến từ Việt Nam ạ.\n"
        "皆様にお礼を申し上げます。 — Tôi xin phép được gửi lời cảm ơn chân thành đến tất cả quý vị.",
        "Shinkanzen Master N3 - Khiêm nhường ngữ đặc biệt",
    ),
    (
        "Bài 12 - Kính ngữ",
        "拝見する（はいけんする）",
        "Xem / Nhìn (Khiêm nhường)",
        "Động từ khiêm nhường đặc biệt của: 見る（みる）",
        "Dùng khi bản thân xem tài liệu, email, sản phẩm do đối phương hoặc bề trên cung cấp.",
        "昨日送っていただいたメールを拝見しました。 — Tôi đã đọc kỹ bức thư điện tử mà quý khách gửi hôm qua rồi ạ.\n"
        "新しい企画書を拝見してもよろしいでしょうか。 — Cho phép tôi được xem qua bản đề án mới được không ạ?",
        "Shinkanzen Master N3 - Khiêm nhường ngữ đặc biệt",
    ),
    (
        "Bài 12 - Kính ngữ",
        "いただく / いただきます",
        "Ăn / Uống / Nhận (Khiêm nhường)",
        "Động từ khiêm nhường đặc biệt của: 食べる・飲む・もらう",
        "Dùng khi bản thân ăn uống đồ được mời hoặc nhận đồ vật, sự giúp đỡ từ người bề trên.",
        "課長から素敵なお土産をいただきました。 — Em đã nhận được món quà lưu niệm rất đẹp từ trưởng phòng ạ.\n"
        "ごちそうさまでした。美味しくいただきました。 — Cảm ơn vì bữa ăn, em đã ăn rất ngon miệng ạ.",
        "Shinkanzen Master N3 - Khiêm nhường ngữ đặc biệt",
    ),
    (
        "Bài 12 - Kính ngữ",
        "伺う（うかがう）[Đến / Thăm]",
        "Đến / Ghé thăm (Khiêm nhường)",
        "Động từ khiêm nhường của: 行く・訪ねる（たずねる）",
        "Dùng khi bản thân đến nhà, cơ quan của bề trên hoặc khách hàng để thăm hỏi, làm việc.",
        "明日の午後3時にご挨拶に伺います。 — Chiều mai vào lúc 3 giờ tôi xin phép qua chào hỏi quý khách ạ.\n"
        "先生のお宅に伺ってもよろしいでしょうか。 — Em có thể xin phép đến thăm nhà thầy được không ạ?",
        "Shinkanzen Master N3 - Khiêm nhường ngữ đặc biệt",
    ),
    (
        "Bài 12 - Kính ngữ",
        "伺う（うかがう）[Hỏi / Nghe]",
        "Hỏi / Nghe (Khiêm nhường)",
        "Động từ khiêm nhường của: 聞く（きく）",
        "Dùng khi muốn hỏi thông tin từ bề trên hoặc nghe danh tiếng, chuyện gì đó về đối phương.",
        "ちょっとお話を伺ってもよろしいでしょうか。 — Cho phép em xin được hỏi/nghe anh chị một lát được không ạ?\n"
        "お噂はかねがね伺っております。 — Danh tiếng của quý ngài tôi đã được nghe từ lâu rồi ạ.",
        "Shinkanzen Master N3 - Khiêm nhường ngữ đặc biệt",
    ),
    (
        "Bài 12 - Kính ngữ",
        "存じる（ぞんじる） / 存じ上げる（ぞんじあげる）",
        "Biết / Nghĩ (Khiêm nhường)",
        "Động từ khiêm nhường của: 知る（しる）・思う（おもう）",
        "Dùng khi bản thân biết hoặc suy nghĩ về một sự việc, con người đối với người bề trên.",
        "その件につきましては、私も存じ上げております。 — Về vấn đề đó thì bản thân tôi cũng đã được biết rồi ạ.\n"
        "お役に立てれば幸いだと存じます。 — Tôi nghĩ rằng thật may mắn nếu có thể giúp ích được cho quý ngài.",
        "Shinkanzen Master N3 - Khiêm nhường ngữ đặc biệt",
    ),
    (
        "Bài 12 - Kính ngữ",
        "いたす / いたします",
        "Làm (Khiêm nhường)",
        "Động từ khiêm nhường đặc biệt của: する",
        "Dùng khi bản thân làm việc gì đó vì đối phương hoặc thực hiện công việc bổn phận.",
        "その荷物は私が準備いたします。 — Phần hành lý đó tôi xin phép được tự mình chuẩn bị ạ.\n"
        "今後ともよろしくお願いいたします。 — Từ nay về sau cũng rất mong được quý ngài chiếu cố giúp đỡ.",
        "Shinkanzen Master N3 - Khiêm nhường ngữ đặc biệt",
    ),
    (
        "Bài 12 - Kính ngữ",
        "お目にかかる（おめにかかる）",
        "Gặp gỡ (Khiêm nhường)",
        "Động từ khiêm nhường đặc biệt của: 会う（あう）",
        "Dùng khi bản thân vinh dự được gặp mặt người bề trên, đối tác quan trọng.",
        "本日、先生にお目にかかれて大変光栄です。 — Hôm nay em rất lấy làm vinh hạnh khi được gặp mặt thầy ạ.\n"
        "また近いうちにお目にかかりたいと存じます。 — Tôi rất mong sẽ được tái kiến quý ngài trong thời gian sớm nhất.",
        "Shinkanzen Master N3 - Khiêm nhường ngữ đặc biệt",
    ),
    (
        "Bài 12 - Kính ngữ",
        "差し上げる（さしあげる）",
        "Tặng / Biếu (Khiêm nhường)",
        "Động từ khiêm nhường đặc biệt của: あげる\nĐi cùng V-te: ～て差し上げる",
        "Dùng khi bản thân tặng quà hoặc làm điều gì giúp đỡ người bề trên (cần dùng khéo léo để không tạo cảm giác ban ơn).",
        "先生にベトナムのお茶を差し上げました。 — Em đã kính biếu thầy một chút trà đặc sản Việt Nam ạ.\n"
        "後ほど折り返しお電話を差し上げます。 — Lát nữa tôi xin phép gọi điện thoại lại cho quý khách ạ.",
        "Shinkanzen Master N3 - Khiêm nhường ngữ đặc biệt",
    ),
    (
        "Bài 12 - Kính ngữ",
        "拝読する（はいどくする）",
        "Đọc (Khiêm nhường)",
        "Động từ khiêm nhường đặc biệt của: 読む（よむ）",
        "Dùng khi bản thân đọc thư từ, sách, bài viết của người bề trên hoặc khách hàng.",
        "先生のご著書を拝読いたしました。大変勉強になりました。 — Em đã được đọc tác phẩm của thầy rồi ạ. Em đã học hỏi được rất nhiều điều.\n"
        "いただいたお手紙をありがたく拝読しました。 — Tôi đã trân trọng đọc lá thư quý ngài gửi tới.",
        "Shinkanzen Master N3 - Khiêm nhường ngữ đặc biệt",
    ),

    # --- 3. CÁC DẠNG QUY TẮC & MẪU CÂU KÍNH NGỮ N3 ---
    (
        "Bài 12 - Kính ngữ",
        "お + V(bỏ ます) + になる / ご + N + になる",
        "Tôn kính ngữ quy tắc",
        "Động từ nhóm 1 & 2: お + V(bỏ ます) + になる\nDanh từ nhóm 3: ご + Danh từ Hán tự + になる",
        "Quy tắc tôn kính chuẩn cho các động từ không có dạng đặc biệt. Nhấn mạnh sự tôn kính đối với hành vi của người khác.",
        "社長はもうお戻りになりましたか。 — Giám đốc đã quay trở lại văn phòng chưa ạ?\n"
        "先生は毎朝、公園を散歩なさいますか／お散歩になりますか。 — Mỗi sáng thầy có đi dạo ở công viên không ạ?\n"
        "部長は新しい車をご利用になります。 — Trưởng phòng sẽ sử dụng chiếc xe ô tô mới.",
        "Shinkanzen Master N3 - Quy tắc kính ngữ",
    ),
    (
        "Bài 12 - Kính ngữ",
        "V-(ら)れる (Thể bị động mang nghĩa tôn kính)",
        "Tôn kính ngữ dạng bị động",
        "Nhóm 1: V(cột a) + れる (書かれる、話される)\nNhóm 2: V(bỏ ます) + られる (来られる、見られる)\nNhóm 3: される、こられる",
        "Biểu thị sự tôn kính ở mức độ vừa phải, tự nhiên và gần gũi trong công việc hằng ngày, nhẹ nhàng hơn 'お～になる'.",
        "先生は昨日、何時ごろ帰られましたか。 — Hôm qua thầy ra về vào khoảng mấy giờ thế ạ?\n"
        "お客様、こちらでタバコを吸われますか。 — Thưa quý khách, quý khách có hút thuốc ở khu vực này không ạ?",
        "Shinkanzen Master N3 - Quy tắc kính ngữ",
    ),
    (
        "Bài 12 - Kính ngữ",
        "お + V(bỏ ます) + です / ご + N + です",
        "Tôn kính diễn tả trạng thái nhẹ nhàng",
        "お + V(bỏ ます) + です\nご + Danh từ Hán tự + です",
        "Là cách nói tôn kính nhẹ nhàng, lịch sự để hỏi hoặc miêu tả trạng thái hiện tại của đối phương, thay thế cho '～ていますか'.",
        "本日は何をお探しですか。 — Hôm nay quý khách đang tìm kiếm món đồ gì ạ?\n"
        "社長、今週の予定はご存知ですか／お決まりですか。 — Thưa giám đốc, lịch trình tuần này của ngài đã ấn định chưa ạ?",
        "Shinkanzen Master N3 - Quy tắc kính ngữ",
    ),
    (
        "Bài 12 - Kính ngữ",
        "お + V(bỏ ます) + ください / ご + N + ください",
        "Xin mời làm... (Yêu cầu kính cẩn)",
        "Động từ nhóm 1, 2: お + V(bỏ ます) + ください\nDanh từ nhóm 3: ご + N + ください",
        "Dùng để mời hoặc nhờ vả khách hàng, bề trên làm việc gì đó một cách trang nhã và tôn kính hơn hẳn '～てください'.",
        "どうぞこちらにお掛けになってお待ちください。 — Xin mời quý khách ngồi vào đây và đợi một chút ạ.\n"
        "危険ですので、白線の内側にご注意ください。 — Vì nguy hiểm nên xin quý khách hãy chú ý đứng bên trong vạch trắng ạ.",
        "Shinkanzen Master N3 - Quy tắc kính ngữ",
    ),
    (
        "Bài 12 - Kính ngữ",
        "お + V(bỏ ます) + する / いたす ・ ご + N + する / いたす",
        "Khiêm nhường ngữ quy tắc",
        "Động từ nhóm 1, 2: お + V(bỏ ます) + する／いたす\nDanh từ nhóm 3: ご + N + する／いたす",
        "Dùng khi bản thân thực hiện hành động có hướng tới hoặc giúp đỡ người bề trên, khách hàng.",
        "重そうですね。お荷物をお持ちいたしましょうか。 — Trông có vẻ nặng quá ạ, để tôi xách hành lý giúp quý khách nhé?\n"
        "後ほどメールでスケジュールをご連絡いたします。 — Lát nữa em xin phép sẽ liên lạc lịch trình cụ thể qua email ạ.",
        "Shinkanzen Master N3 - Quy tắc kính ngữ",
    ),
    (
        "Bài 12 - Kính ngữ",
        "V-ていただく / V-ていただきます",
        "Được bề trên làm cho việc gì (Khiêm nhường)",
        "V-て + いただく／いただきます",
        "Thể khiêm nhường của '～てもらう'. Biểu thị lòng biết ơn sâu sắc khi nhận được sự giúp đỡ, chỉ bảo từ bề trên.",
        "先生に日本語の作文を直していただきました。 — Em đã được thầy giáo sửa giúp bài văn tiếng Nhật ạ.\n"
        "課長に美味しい料理をごちそうしていただきました。 — Em đã được trưởng phòng chiêu đãi một bữa ăn rất ngon.",
        "Shinkanzen Master N3 - Quy tắc kính ngữ",
    ),
    (
        "Bài 12 - Kính ngữ",
        "V-(さ)せていただく / V-(さ)せていただきます",
        "Xin phép được làm việc gì (Khiêm nhường)",
        "Thể sai khiến V-(さ)せて + いただく",
        "Dùng khi người nói khiêm tốn xin phép đối phương để bản thân được thực hiện hành động có lợi cho mình.",
        "体調が優れないため、本日は早退させていただきます。 — Do sức khỏe không tốt nên hôm nay em xin phép được về sớm ạ.\n"
        "自己紹介をさせていただきます。 — Cho phép tôi xin được tự giới thiệu về bản thân mình.",
        "Shinkanzen Master N3 - Quy tắc kính ngữ",
    ),
    (
        "Bài 12 - Kính ngữ",
        "V-ていただけないでしょうか / V-ていただけますでしょうか",
        "Liệu có thể vui lòng... giúp tôi được không ạ?",
        "V-て + いただけないでしょうか / いただけますでしょうか",
        "Mẫu câu nhờ vả vô cùng lịch sự và trang trọng trong công sở, đề nghị đối phương giúp đỡ mà không hề gây áp lực.",
        "この書類の内容を一度確認していただけないでしょうか。 — Anh/chị có thể vui lòng xem qua nội dung tài liệu này giúp em được không ạ?\n"
        "もう一度説明していただけますでしょうか。 — Ngài có thể vui lòng giải thích lại thêm một lần nữa giúp em được không ạ?",
        "Shinkanzen Master N3 - Quy tắc kính ngữ",
    ),
    (
        "Bài 12 - Kính ngữ",
        "〜でございます",
        "Là / Dạ thưa là (Lịch sự trang trọng)",
        "Thể lịch sự (丁寧語) của: ～です / ～である",
        "Dùng trong giao dịch kinh doanh, phục vụ nhà hàng khách sạn để giới thiệu sự vật, sự việc một cách tao nhã nhất.",
        "こちらが本日の特別メニューでございます。 — Dạ đây là thực đơn đặc biệt của ngày hôm nay ạ.\n"
        "私、担当の山田でございます。どうぞよろしくお願いいたします。 — Dạ tôi là Yamada, người phụ trách dịch vụ ạ.",
        "Shinkanzen Master N3 - Quy tắc kính ngữ",
    ),
]
