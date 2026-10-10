import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated, ScrollView, Modal, TextInput, RefreshControl, Platform, useWindowDimensions, Pressable, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import { Calendar } from 'react-native-calendars';
import { SkeletonLoader } from '../SkeletonLoader';
import { useTheme } from '../../hooks/useTheme';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Icon } from '../ui/Icon';

export const DocumentsTab = ({ email, isLoading, documents, fetchDocuments, uploadDocument, downloadDocument, deleteDocument, notices, noticePage, noticeTotalPages, fetchNotices, createNotice, deleteNotice, updateNotice, styles, colors, allowDownload, userRole, userPositionLevel }: any) => {
    useFocusEffect(
        useCallback(() => {
            fetchNotices(1);
            fetchDocuments();
        }, [])
    );

    const [uploadModalVisible, setUploadModalVisible] = useState(false);
    const [docTitle, setDocTitle] = useState('');
    const [docDesc, setDocDesc] = useState('');
    const [selectedFile, setSelectedFile] = useState<any>(null);
    const [currentDocIndex, setCurrentDocIndex] = useState(0);

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
    const { width } = useWindowDimensions();
    const isDesktop = width > 768;
    const docScrollRef = useRef<any>(null);

    const slideLeft = () => {
        if (currentDocIndex > 0) {
            docScrollRef.current?.scrollTo({ x: (currentDocIndex - 1) * (isDesktop ? 752 : width - 48), animated: true });
            setCurrentDocIndex(currentDocIndex - 1);
        }
    };
    const slideRight = () => {
        const totalItems = (documents?.length || 0) + (allowDownload ? 1 : 0);
        if (currentDocIndex < totalItems - 1) {
            docScrollRef.current?.scrollTo({ x: (currentDocIndex + 1) * (isDesktop ? 752 : width - 48), animated: true });
            setCurrentDocIndex(currentDocIndex + 1);
        }
    };

    const handleUpload = async () => {
        if (!docTitle || !selectedFile) { alert('제목과 파일을 선택해주세요.'); return; }
        const success = await uploadDocument(docTitle, docDesc, selectedFile);
        if (success) { setUploadModalVisible(false); setDocTitle(''); setDocDesc(''); setSelectedFile(null); }
    };

    const pickDocument = async () => {
        let result = await DocumentPicker.getDocumentAsync({});
        if (!result.canceled) { setSelectedFile(result.assets[0]); }
    };

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

    const renderRightActions = (id: number) => {
        return (
            <TouchableOpacity 
                style={{ backgroundColor: colors.danger, justifyContent: 'center', alignItems: 'center', width: 80, height: '100%', borderRadius: 24, marginLeft: 12 }} 
                onPress={() => {
                    Alert.alert('삭제 확인', '정말 삭제하시겠습니까?', [
                        { text: '취소', style: 'cancel' },
                        { text: '삭제', style: 'destructive', onPress: async () => {
                            await deleteNotice(id);
                        }}
                    ]);
                }}
            >
                <Icon name="trash-2" size={24} color={colors.onPrimary} />
            </TouchableOpacity>
        );
    };

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, paddingBottom: 100, maxWidth: 800, width: '100%', alignSelf: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 32 }}>
                <Icon name="shield" size={28} color={colors.text} style={{ marginRight: 12 }} />
                <Text style={[styles.title, { textAlign: 'left', marginBottom: 0 }]}>Intelligence</Text>
            </View>
            
            <View style={{ marginBottom: 16 }}>
                <Text style={[styles.heading3, { marginBottom: 12 }]}>Top Secret Documents</Text>
                <View style={{ position: 'relative' }}>
                    {isDesktop && currentDocIndex > 0 && (
                        <TouchableOpacity 
                            onPress={slideLeft} 
                            style={{ position: 'absolute', left: -20, top: '40%', zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.cardBackground, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 }}
                        >
                            <Icon name="chevron-left" size={24} color={colors.text} />
                        </TouchableOpacity>
                    )}
                    {isDesktop && currentDocIndex < ((documents?.length || 0) + (allowDownload ? 1 : 0) - 1) && (
                        <TouchableOpacity 
                            onPress={slideRight} 
                            style={{ position: 'absolute', right: -20, top: '40%', zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.cardBackground, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 }}
                        >
                            <Icon name="chevron-right" size={24} color={colors.text} />
                        </TouchableOpacity>
                    )}
                    <ScrollView 
                        ref={docScrollRef}
                        horizontal 
                        pagingEnabled
                        showsHorizontalScrollIndicator={false} 
                        contentContainerStyle={{ paddingBottom: 8 }}
                        onMomentumScrollEnd={(e) => {
                            const slideSize = e.nativeEvent.layoutMeasurement.width;
                            const index = e.nativeEvent.contentOffset.x / slideSize;
                            setCurrentDocIndex(Math.round(index));
                        }}
                        scrollEventThrottle={16}
                        snapToInterval={isDesktop ? 752 : width - 48}
                        decelerationRate="fast"
                    >
                        {isLoading && documents?.length === 0 ? (
                            <View style={[styles.cardFeatured, { width: isDesktop ? 752 : width - 48, marginHorizontal: 0 }]}>
                                <SkeletonLoader height={24} width="100%" style={{ marginBottom: 12 }} />
                                <SkeletonLoader height={24} width="70%" />
                            </View>
                        ) : (
                            documents?.map((doc: any) => {
                                const canManageDocs = userRole === 'ADMIN' || userPositionLevel >= 3;
                                return (
                                    <View key={doc.id} style={[styles.cardFeatured, { width: isDesktop ? 752 : width - 48, marginHorizontal: 0 }]}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <View style={{ flex: 1, marginRight: 8 }}>
                                                <Text style={[styles.infoText, { fontWeight: '700', fontSize: 18, marginBottom: 4 }]} numberOfLines={2}>{doc.title}</Text>
                                                <Text style={[styles.noticeMeta, { marginBottom: 16 }]} numberOfLines={2}>{doc.description}</Text>
                                            </View>
                                            {canManageDocs && (
                                                <TouchableOpacity 
                                                    onPress={() => {
                                                        if (Platform.OS === 'web') {
                                                            if (window.confirm('기밀 문서를 삭제하시겠습니까?')) deleteDocument(doc.id);
                                                        } else {
                                                            Alert.alert('기밀 문서 삭제', '정말 삭제하시겠습니까?', [
                                                                { text: '취소', style: 'cancel' },
                                                                { text: '삭제', style: 'destructive', onPress: () => deleteDocument(doc.id) }
                                                            ]);
                                                        }
                                                    }} 
                                                    style={{ padding: 8, backgroundColor: colors.danger + '20', borderRadius: 8 }}
                                                >
                                                    <Icon name="trash-2" size={18} color={colors.danger} />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                        <View style={{ flex: 1 }} />
                                        <Text style={[styles.noticeMeta, { marginBottom: 12 }]}>{doc.original_name}{doc.author ? ` · 등록자: ${doc.author}` : ''}</Text>
                                        <TouchableOpacity 
                                            style={[styles.buttonOutline, { marginBottom: 0, flexDirection: 'row', justifyContent: 'center', opacity: allowDownload ? 1 : 0.5 }]} 
                                            onPress={() => downloadDocument(doc.id, doc.original_name)} 
                                            disabled={isLoading || !allowDownload}
                                        >
                                            <Icon name={allowDownload ? "download" : "lock"} size={16} color={colors.text} style={{ marginRight: 8 }} />
                                            <Text style={styles.buttonOutlineText}>{allowDownload ? 'Download PDF' : 'Download Disabled'}</Text>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })
                        )}
                        
                        {allowDownload && (userRole === 'ADMIN' || userPositionLevel >= 3) && (
                            <TouchableOpacity 
                                style={[styles.cardFeatured, { width: isDesktop ? 752 : width - 48, marginHorizontal: 0, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: colors.borderSoft, backgroundColor: 'transparent' }]}
                                onPress={() => setUploadModalVisible(true)}
                            >
                                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                                    <Icon name="plus" size={24} color={colors.onPrimary} />
                                </View>
                                <Text style={[styles.infoText, { fontWeight: 'bold' }]}>새 문서 업로드</Text>
                                <Text style={styles.noticeMeta}>과장 이상 / CORPORATE 전용</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                    
                    {/* Pagination Dots */}
                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12 }}>
                        {Array.from({ length: (documents?.length || 0) + (allowDownload ? 1 : 0) }).map((_, i) => (
                            <View 
                                key={i} 
                                style={{ 
                                    width: 8, height: 8, borderRadius: 4, 
                                    backgroundColor: currentDocIndex === i ? colors.text : colors.borderSoft, 
                                    marginHorizontal: 4 
                                }} 
                            />
                        ))}
                    </View>
                </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, marginBottom: 16 }}>
                <Text style={[styles.heading3, { marginBottom: 0 }]}>Notice Board</Text>
                <TouchableOpacity onPress={() => setModalVisible(true)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="plus" size={18} color={colors.accent} style={{ marginRight: 4 }} />
                    <Text style={[styles.buttonOutlineText, { color: colors.accent }]}>New</Text>
                </TouchableOpacity>
            </View>

            {notices.map((notice: any) => {
                const isAuthor = userRole === 'ADMIN' || userPositionLevel >= 3 || (userPositionLevel >= 2 && notice.author === currentUserHandle);
                const CardContent = (
                    <View style={[styles.card, { flexDirection: 'row', alignItems: 'center', marginBottom: Platform.OS === 'web' ? 12 : 0, padding: 0 }]}>
                                <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', padding: 16 }} onPress={() => { 
                        setSelectedNotice(notice); 
                        setEditTitle(notice.title);
                        setEditContent(notice.content);
                        setIsEditing(false);
                        setDetailVisible(true); 
                    }}>
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
                );
                return (
                    <View key={notice.id} style={{ marginBottom: 12 }}>
                        {CardContent}
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

            {/* 새 문서 업로드 모달 */}
            <Modal visible={uploadModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isDesktop && { maxWidth: 600, width: '100%', alignSelf: 'center' }]}>
                        <Text style={styles.heading2}>Upload Secret Document</Text>
                        <TextInput style={styles.input} placeholder="문서 제목" placeholderTextColor={colors.subText} value={docTitle} onChangeText={setDocTitle} />
                        <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="문서 설명 (선택)" placeholderTextColor={colors.subText} multiline value={docDesc} onChangeText={setDocDesc} />
                        
                        <TouchableOpacity style={[styles.buttonOutline, { flexDirection: 'row', justifyContent: 'center', marginBottom: 16 }]} onPress={pickDocument}>
                            <Icon name="file-plus" size={20} color={colors.text} style={{ marginRight: 8 }} />
                            <Text style={styles.buttonOutlineText}>{selectedFile ? selectedFile.name : '파일 선택하기'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.button, { flexDirection: 'row', justifyContent: 'center' }]} onPress={handleUpload}>
                            <Icon name="upload-cloud" size={20} color={colors.onPrimary} style={{ marginRight: 8 }} />
                            <Text style={styles.buttonText}>Upload</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.buttonOutline, { flexDirection: 'row', justifyContent: 'center' }]} onPress={() => {setUploadModalVisible(false); setSelectedFile(null);}}>
                            <Icon name="x" size={20} color={colors.text} style={{ marginRight: 8 }} />
                            <Text style={styles.buttonOutlineText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* 새 글 작성 모달 */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isDesktop && { maxWidth: 600, width: '100%', alignSelf: 'center' }]}>
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
                    <View style={[styles.modalContent, isDesktop && { maxWidth: 600, width: '100%', alignSelf: 'center' }]}>
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
        </ScrollView>
    );
};

