import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Platform, useWindowDimensions, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { SkeletonLoader } from '../../SkeletonLoader';
import { Icon } from '../../ui/Icon';

interface DocumentSectionProps {
    isLoading: boolean;
    documents: any[];
    downloadDocument: (id: number, name: string) => void;
    uploadDocument: (title: string, desc: string, file: any) => Promise<boolean>;
    deleteDocument: (id: number) => void;
    allowDownload: boolean;
    userRole: string;
    userPositionLevel: number;
    styles: any;
    colors: any;
}

export const DocumentSection: React.FC<DocumentSectionProps> = ({
    isLoading,
    documents,
    downloadDocument,
    uploadDocument,
    deleteDocument,
    allowDownload,
    userRole,
    userPositionLevel,
    styles,
    colors
}) => {
    const { width } = useWindowDimensions();
    const isDesktop = width > 768;
    const docScrollRef = useRef<any>(null);

    const [currentDocIndex, setCurrentDocIndex] = useState(0);
    const [uploadModalVisible, setUploadModalVisible] = useState(false);
    const [docTitle, setDocTitle] = useState('');
    const [docDesc, setDocDesc] = useState('');
    const [selectedFile, setSelectedFile] = useState<any>(null);

    const totalItems = (documents?.length || 0) + (allowDownload ? 1 : 0);

    const slideLeft = () => {
        if (currentDocIndex > 0) {
            docScrollRef.current?.scrollTo({ x: (currentDocIndex - 1) * (isDesktop ? 752 : width - 48), animated: true });
            setCurrentDocIndex(currentDocIndex - 1);
        }
    };

    const slideRight = () => {
        if (currentDocIndex < totalItems - 1) {
            docScrollRef.current?.scrollTo({ x: (currentDocIndex + 1) * (isDesktop ? 752 : width - 48), animated: true });
            setCurrentDocIndex(currentDocIndex + 1);
        }
    };

    const pickDocument = async () => {
        const result = await DocumentPicker.getDocumentAsync({});
        if (!result.canceled) {
            setSelectedFile(result.assets[0]);
        }
    };

    const handleUpload = async () => {
        if (!docTitle || !selectedFile) {
            Alert.alert('알림', '제목과 파일을 선택해주세요.');
            return;
        }
        const success = await uploadDocument(docTitle, docDesc, selectedFile);
        if (success) {
            setUploadModalVisible(false);
            setDocTitle('');
            setDocDesc('');
            setSelectedFile(null);
        }
    };

    return (
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
                {isDesktop && currentDocIndex < totalItems - 1 && (
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
                    {Array.from({ length: totalItems }).map((_, i) => (
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
                        <TouchableOpacity style={[styles.buttonOutline, { flexDirection: 'row', justifyContent: 'center' }]} onPress={() => { setUploadModalVisible(false); setSelectedFile(null); }}>
                            <Icon name="x" size={20} color={colors.text} style={{ marginRight: 8 }} />
                            <Text style={styles.buttonOutlineText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};
