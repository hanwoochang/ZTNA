import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Platform, Alert } from 'react-native';
import { Icon } from '../../ui/Icon';

interface NoticeSectionProps {
    email: string;
    notices: any[];
    noticePage: number;
    noticeTotalPages: number;
    fetchNotices: (page: number) => void;
    createNotice: (title: string, content: string, targetDept: string, targetPos: number) => Promise<boolean>;
    deleteNotice: (id: number) => Promise<boolean>;
    updateNotice: (id: number, title: string, content: string) => Promise<boolean>;
    userRole: string;
    userPositionLevel: number;
    styles: any;
    colors: any;
}

export const NoticeSection: React.FC<NoticeSectionProps> = ({
    email,
    notices,
    noticePage,
    noticeTotalPages,
    fetchNotices,
    createNotice,
    deleteNotice,
    updateNotice,
    userRole,
    userPositionLevel,
    styles,
    colors
}) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [detailVisible, setDetailVisible] = useState(false);
    const [selectedNotice, setSelectedNotice] = useState<any>(null);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [targetDept, setTargetDept] = useState('ALL');
    const [targetPos, setTargetPos] = useState(1);

    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');

    const currentUserHandle = email?.split('@')[0] || '';

    const handleCreate = async () => {
        const success = await createNotice(newTitle, newContent, targetDept, targetPos);
        if (success) {
            setModalVisible(false);
            setNewTitle('');
            setNewContent('');
            setTargetDept('ALL');
            setTargetPos(1);
        }
    };

    const handleUpdate = async () => {
        if (!selectedNotice) return;
        const success = await updateNotice(selectedNotice.id, editTitle, editContent);
        if (success) {
            setSelectedNotice({ ...selectedNotice, title: editTitle, content: editContent, date: new Date().toISOString().split('T')[0], is_edited: 1 });
            setIsEditing(false);
        }
    };

    return (
        <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, marginBottom: 16 }}>
                <Text style={[styles.heading3, { marginBottom: 0 }]}>Notice Board</Text>
                <TouchableOpacity onPress={() => setModalVisible(true)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="plus" size={18} color={colors.accent} style={{ marginRight: 4 }} />
                    <Text style={[styles.buttonOutlineText, { color: colors.accent }]}>New</Text>
                </TouchableOpacity>
            </View>

            {notices.map((notice: any) => {
                const isAuthor = userRole === 'ADMIN' || userPositionLevel >= 3 || (userPositionLevel >= 2 && notice.author === currentUserHandle);
                return (
                    <View key={notice.id} style={{ marginBottom: 12 }}>
                        <View style={[styles.card, { flexDirection: 'row', alignItems: 'center', marginBottom: Platform.OS === 'web' ? 12 : 0, padding: 0 }]}>
                            <TouchableOpacity 
                                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', padding: 16 }} 
                                onPress={() => { 
                                    setSelectedNotice(notice); 
                                    setEditTitle(notice.title);
                                    setEditContent(notice.content);
                                    setIsEditing(false);
                                    setDetailVisible(true); 
                                }}
                            >
                                <Icon name="file-text" size={24} color={colors.subText} style={{ marginRight: 16 }} />
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.infoText, { fontWeight: '700', marginBottom: 4 }]} numberOfLines={1}>{notice.title}</Text>
                                    <Text style={[styles.infoText, { color: colors.subText, fontSize: 13, marginBottom: 0 }]} numberOfLines={1}>
                                        {notice.author} • {notice.date}{notice.is_edited ? ' (수정됨)' : ''}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                            {isAuthor && (
                                <TouchableOpacity 
                                    style={{ padding: 12, borderRadius: 12, marginRight: 16 }}
                                    onPress={(e) => { 
                                        e.stopPropagation(); 
                                        if (Platform.OS === 'web') {
                                            if (window.confirm('정말 삭제하시겠습니까?')) deleteNotice(notice.id);
                                        } else {
                                            Alert.alert('삭제 확인', '정말 삭제하시겠습니까?', [
                                                { text: '취소', style: 'cancel' },
                                                { text: '삭제', style: 'destructive', onPress: () => deleteNotice(notice.id) }
                                            ]);
                                        }
                                    }}
                                >
                                    <Icon name="trash-2" size={20} color={colors.danger} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                );
            })}
            
            {/* Pagination Controls */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16, marginBottom: 32 }}>
                <TouchableOpacity onPress={() => fetchNotices(noticePage - 1)} disabled={noticePage <= 1} style={{ padding: 8, opacity: noticePage <= 1 ? 0.3 : 1 }}>
                    <Icon name="chevron-left" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.infoText, { marginHorizontal: 16, fontWeight: 'bold', marginBottom: 0 }]}>{noticePage} / {noticeTotalPages}</Text>
                <TouchableOpacity onPress={() => fetchNotices(noticePage + 1)} disabled={noticePage >= noticeTotalPages} style={{ padding: 8, opacity: noticePage >= noticeTotalPages ? 0.3 : 1 }}>
                    <Icon name="chevron-right" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            {/* 새 글 작성 모달 */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.heading2}>New Notice</Text>
                        <TextInput style={styles.input} placeholder="Title" placeholderTextColor={colors.subText} value={newTitle} onChangeText={setNewTitle} />
                        <TextInput style={[styles.input, { height: 120, textAlignVertical: 'top' }]} placeholder="Content" placeholderTextColor={colors.subText} multiline value={newContent} onChangeText={setNewContent} />
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ color: colors.subText, marginBottom: 8, fontSize: 14 }}>조회 가능 부서</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                                {['ALL', '일반부서', '재무팀', '인사팀', '보안팀'].map(d => (
                                    <TouchableOpacity key={d} onPress={() => setTargetDept(d)} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: targetDept === d ? colors.accent : colors.field, marginRight: 8 }}>
                                        <Text style={{ color: targetDept === d ? colors.onPrimary : colors.text, fontWeight: 'bold' }}>{d === 'ALL' ? '전체 부서' : d}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ color: colors.subText, marginBottom: 8, fontSize: 14 }}>조회 가능 직급</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                                {[{l:1, n:'제한 없음'}, {l:2, n:'대리 이상'}, {l:3, n:'과장 이상'}, {l:4, n:'차장 이상'}, {l:5, n:'부장 이상'}, {l:6, n:'임원 전용'}].map(p => (
                                    <TouchableOpacity key={p.l} onPress={() => setTargetPos(p.l)} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: targetPos === p.l ? colors.accent : colors.field, marginRight: 8 }}>
                                        <Text style={{ color: targetPos === p.l ? colors.onPrimary : colors.text, fontWeight: 'bold' }}>{p.n}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                        <TouchableOpacity style={[styles.button, { flexDirection: 'row', justifyContent: 'center' }]} onPress={handleCreate}>
                            <Icon name="check-circle" size={20} color={colors.onPrimary} style={{ marginRight: 8 }} />
                            <Text style={styles.buttonText}>Post</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.buttonOutline, { flexDirection: 'row', justifyContent: 'center' }]} onPress={() => setModalVisible(false)}>
                            <Icon name="x" size={20} color={colors.text} style={{ marginRight: 8 }} />
                            <Text style={styles.buttonOutlineText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* 상세 보기 / 수정 모달 */}
            <Modal visible={detailVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {!isEditing ? (
                            <>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.heading2}>{selectedNotice?.title}</Text>
                                    </View>
                                    {(userRole === 'ADMIN' || userPositionLevel >= 3 || (userPositionLevel >= 2 && selectedNotice?.author === currentUserHandle)) && (
                                        <View style={{ flexDirection: 'row' }}>
                                            <TouchableOpacity onPress={() => setIsEditing(true)} style={{ padding: 4, marginLeft: 8 }}>
                                                <Icon name="edit-2" size={20} color={colors.accent} />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={async () => {
                                                if (Platform.OS === 'web') {
                                                    if (window.confirm('정말 삭제하시겠습니까?')) {
                                                        const success = await deleteNotice(selectedNotice.id);
                                                        if (success) setDetailVisible(false);
                                                    }
                                                } else {
                                                    Alert.alert('삭제 확인', '정말 삭제하시겠습니까?', [
                                                        { text: '취소', style: 'cancel' },
                                                        { text: '삭제', style: 'destructive', onPress: async () => {
                                                            const success = await deleteNotice(selectedNotice.id);
                                                            if (success) setDetailVisible(false);
                                                        }}
                                                    ]);
                                                }
                                            }} style={{ padding: 4, marginLeft: 8 }}>
                                                <Icon name="trash-2" size={20} color={colors.danger} />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                                <Text style={[styles.noticeMeta, { marginBottom: 24 }]}>{selectedNotice?.author} • {selectedNotice?.date}{selectedNotice?.is_edited ? ' (수정됨)' : ''}</Text>
                                <Text style={styles.infoText}>{selectedNotice?.content}</Text>
                                <View style={{ marginTop: 32 }}>
                                    <TouchableOpacity style={[styles.buttonOutline, { flexDirection: 'row', justifyContent: 'center' }]} onPress={() => setDetailVisible(false)}>
                                        <Icon name="x" size={20} color={colors.text} style={{ marginRight: 8 }} />
                                        <Text style={styles.buttonOutlineText}>Close</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            <>
                                <Text style={styles.heading2}>Edit Notice</Text>
                                <TextInput style={styles.input} placeholder="Title" placeholderTextColor={colors.subText} value={editTitle} onChangeText={setEditTitle} />
                                <TextInput style={[styles.input, { height: 120, textAlignVertical: 'top' }]} placeholder="Content" placeholderTextColor={colors.subText} multiline value={editContent} onChangeText={setEditContent} />
                                <TouchableOpacity style={[styles.button, { flexDirection: 'row', justifyContent: 'center' }]} onPress={handleUpdate}>
                                    <Icon name="check-circle" size={20} color={colors.onPrimary} style={{ marginRight: 8 }} />
                                    <Text style={styles.buttonText}>Save Changes</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.buttonOutline, { flexDirection: 'row', justifyContent: 'center' }]} onPress={() => setIsEditing(false)}>
                                    <Icon name="x" size={20} color={colors.text} style={{ marginRight: 8 }} />
                                    <Text style={styles.buttonOutlineText}>Cancel</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};
